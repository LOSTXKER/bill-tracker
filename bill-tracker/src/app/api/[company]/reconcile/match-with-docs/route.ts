import { prisma } from "@/lib/db";
import { analyzeImage, generateText } from "@/lib/ai/gemini";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

interface DocMatchRequest {
  systemItems: Array<{
    id: string;
    vendorName: string;
    amount: number;
    vatAmount: number;
    date: string;
    taxId?: string;
    type: "expense" | "income";
  }>;
  accountingItems: Array<{
    index: number;
    vendorName: string;
    amount: number;
    vatAmount: number;
    date: string;
    taxId?: string;
  }>;
}

export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
    const body = (await request.json()) as DocMatchRequest;
    const { systemItems, accountingItems } = body;

    if (!systemItems?.length || !accountingItems?.length) {
      return apiResponse.success({ suggestions: [] });
    }

    const MAX_ITEMS = 5;
    const itemsToAnalyze = systemItems.slice(0, MAX_ITEMS);

    const docResults: Array<{
      systemId: string;
      extractedInfo: string;
    }> = [];

    for (const item of itemsToAnalyze) {
      const docUrls = await getDocumentUrls(item.id, item.type);
      if (docUrls.length === 0) continue;

      const urlsToAnalyze = docUrls.slice(0, 3);

      try {
        const extractedTexts: string[] = [];
        for (const url of urlsToAnalyze) {
          const result = await analyzeImage(url, 
            "อ่านข้อมูลจากเอกสารนี้ ระบุ: ยอดเงิน, ยอด VAT, ชื่อผู้ขาย/ลูกค้า, เลขที่ใบกำกับภาษี, เลขประจำตัวผู้เสียภาษี, วันที่ (ถ้ามี) ตอบเป็น text สั้นๆ",
            { timeoutMs: 30_000, maxTokens: 500, retries: 1 }
          );
          if (result.data) {
            extractedTexts.push(result.data);
          }
        }

        if (extractedTexts.length > 0) {
          docResults.push({
            systemId: item.id,
            extractedInfo: extractedTexts.join("\n---\n"),
          });
        }
      } catch (err) {
        console.error(`Doc analysis failed for ${item.id}:`, err);
      }
    }

    if (docResults.length === 0) {
      return apiResponse.success({ suggestions: [] });
    }

    const docContext = docResults
      .map((d) => {
        const sysItem = systemItems.find((s) => s.id === d.systemId);
        return `รายการ id="${d.systemId}" (${sysItem?.vendorName}, ยอด ${sysItem?.amount}):\n  เอกสารแนบระบุ: ${d.extractedInfo}`;
      })
      .join("\n\n");

    const acctList = accountingItems
      .map(
        (a) =>
          `[${a.index}] ชื่อ="${a.vendorName}" ยอด=${a.amount} VAT=${a.vatAmount} วันที่=${a.date} taxId="${a.taxId ?? ""}"`
      )
      .join("\n");

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านบัญชีไทย ช่วยจับคู่รายการโดยใช้ข้อมูลจากเอกสารแนบ (ใบกำกับภาษี, สลิป, หนังสือรับรอง ฯลฯ)

**ข้อมูลจากเอกสารแนบของรายการในระบบ:**
${docContext}

**รายการจากรายงานบัญชี (ที่ยังไม่จับคู่):**
${acctList}

จับคู่โดยใช้ข้อมูลจากเอกสาร — ยอดเงิน ชื่อผู้ขาย เลขที่ใบกำกับ เลข tax ID
ส่งคืน JSON array:
[
  {
    "systemId": "id ของรายการระบบ",
    "accountingIndex": index ของรายการบัญชี,
    "confidence": 0-1,
    "reason": "เหตุผลสั้นๆ ภาษาไทย อ้างอิงข้อมูลจากเอกสาร"
  }
]

ตอบด้วย JSON เท่านั้น`;

    const response = await generateText(prompt, { maxTokens: 2048 });

    let suggestions: Array<{
      systemId: string;
      accountingIndex: number;
      confidence: number;
      reason: string;
    }> = [];

    try {
      const jsonMatch = response.data.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      suggestions = [];
    }

    return apiResponse.success({ suggestions });
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  }
);

async function getDocumentUrls(
  itemId: string,
  type: "expense" | "income"
): Promise<string[]> {
  const urls: string[] = [];

  if (type === "expense") {
    const expense = await prisma.expense.findUnique({
      where: { id: itemId },
      select: {
        taxInvoiceUrls: true,
        slipUrls: true,
        whtCertUrls: true,
        otherDocUrls: true,
      },
    });
    if (!expense) return [];

    for (const field of [
      expense.taxInvoiceUrls,
      expense.slipUrls,
      expense.whtCertUrls,
      expense.otherDocUrls,
    ]) {
      const parsed = parseJsonUrls(field);
      urls.push(...parsed);
    }
  } else {
    const income = await prisma.income.findUnique({
      where: { id: itemId },
      select: {
        customerSlipUrls: true,
        myBillCopyUrls: true,
        whtCertUrls: true,
        otherDocUrls: true,
      },
    });
    if (!income) return [];

    for (const field of [
      income.customerSlipUrls,
      income.myBillCopyUrls,
      income.whtCertUrls,
      income.otherDocUrls,
    ]) {
      const parsed = parseJsonUrls(field);
      urls.push(...parsed);
    }
  }

  return urls;
}

function parseJsonUrls(val: unknown): string[] {
  if (!val) return [];
  try {
    const arr = typeof val === "string" ? JSON.parse(val) : val;
    if (Array.isArray(arr)) {
      return arr.filter(
        (u: unknown): u is string =>
          typeof u === "string" && u.startsWith("http")
      );
    }
  } catch {
    // ignore
  }
  return [];
}
