import { prisma } from "@/lib/db";
import { analyzeImage, generateText } from "@/lib/ai/gemini";
import { auth } from "@/auth";
import { rateLimit, getClientIP } from "@/lib/security/rate-limit";

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

type SSEEvent =
  | { event: "progress"; data: { step: string; current: number; total: number; itemId?: string; vendorName?: string } }
  | { event: "doc_found"; data: { itemId: string; vendorName: string; docCount: number } }
  | { event: "doc_read"; data: { itemId: string; docIndex: number; docTotal: number; extractedSnippet: string } }
  | { event: "doc_skip"; data: { itemId: string; vendorName: string; reason: string } }
  | { event: "matching"; data: { message: string; itemsWithDocs: number } }
  | { event: "result"; data: { suggestions: Array<{ systemId: string; accountingIndex: number; confidence: number; reason: string }> } }
  | { event: "done"; data: { totalAnalyzed: number; docsRead: number; matchesFound: number } }
  | { event: "error"; data: { message: string } };

function formatSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ company: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const params = await routeContext.params;
  const companyCode = params.company?.toUpperCase();
  if (!companyCode) {
    return new Response(JSON.stringify({ error: "Company code required" }), { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { code: companyCode } });
  if (!company) {
    return new Response(JSON.stringify({ error: "Company not found" }), { status: 404 });
  }

  const access = await prisma.companyAccess.findUnique({
    where: { userId_companyId: { userId: session.user.id, companyId: company.id } },
  });
  if (!access) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const ip = getClientIP(request);
  const { success: rateLimitOk } = rateLimit(ip, { maxRequests: 5, windowMs: 60_000 });
  if (!rateLimitOk) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }

  const body = (await request.json()) as DocMatchRequest;
  const { systemItems, accountingItems } = body;

  if (!systemItems?.length || !accountingItems?.length) {
    return new Response(JSON.stringify({ data: { suggestions: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const MAX_ITEMS = 5;
  const itemsToAnalyze = systemItems.slice(0, MAX_ITEMS);
  const totalItems = itemsToAnalyze.length;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (evt: SSEEvent) => {
        try { controller.enqueue(encoder.encode(formatSSE(evt))); } catch { /* stream closed */ }
      };

      try {
        send({ event: "progress", data: { step: "เริ่มวิเคราะห์เอกสาร", current: 0, total: totalItems } });

        const docResults: Array<{ systemId: string; extractedInfo: string }> = [];
        let totalDocsRead = 0;

        for (let i = 0; i < itemsToAnalyze.length; i++) {
          const item = itemsToAnalyze[i];

          send({
            event: "progress",
            data: {
              step: "ค้นหาเอกสารแนบ",
              current: i + 1,
              total: totalItems,
              itemId: item.id,
              vendorName: item.vendorName,
            },
          });

          const docUrls = await getDocumentUrls(item.id, item.type);

          if (docUrls.length === 0) {
            send({ event: "doc_skip", data: { itemId: item.id, vendorName: item.vendorName, reason: "ไม่พบเอกสารแนบ" } });
            continue;
          }

          send({ event: "doc_found", data: { itemId: item.id, vendorName: item.vendorName, docCount: docUrls.length } });

          const urlsToAnalyze = docUrls.slice(0, 3);
          const extractedTexts: string[] = [];

          for (let d = 0; d < urlsToAnalyze.length; d++) {
            const url = urlsToAnalyze[d];
            try {
              const result = await analyzeImage(
                url,
                "อ่านข้อมูลจากเอกสารนี้ ระบุ: ยอดเงิน, ยอด VAT, ชื่อผู้ขาย/ลูกค้า, เลขที่ใบกำกับภาษี, เลขประจำตัวผู้เสียภาษี, วันที่ (ถ้ามี) ตอบเป็น text สั้นๆ",
                { timeoutMs: 30_000, maxTokens: 500, retries: 1 }
              );

              if (result.data) {
                extractedTexts.push(result.data);
                totalDocsRead++;
                const snippet = result.data.length > 80 ? result.data.slice(0, 80) + "…" : result.data;
                send({ event: "doc_read", data: { itemId: item.id, docIndex: d + 1, docTotal: urlsToAnalyze.length, extractedSnippet: snippet } });
              }
            } catch (err) {
              console.error(`Doc analysis failed for ${item.id} doc ${d}:`, err);
            }
          }

          if (extractedTexts.length > 0) {
            docResults.push({ systemId: item.id, extractedInfo: extractedTexts.join("\n---\n") });
          }
        }

        if (docResults.length === 0) {
          send({ event: "result", data: { suggestions: [] } });
          send({ event: "done", data: { totalAnalyzed: totalItems, docsRead: totalDocsRead, matchesFound: 0 } });
          controller.close();
          return;
        }

        send({ event: "matching", data: { message: "กำลังจับคู่ด้วย AI", itemsWithDocs: docResults.length } });

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

        send({ event: "result", data: { suggestions } });
        send({ event: "done", data: { totalAnalyzed: totalItems, docsRead: totalDocsRead, matchesFound: suggestions.length } });
      } catch (err) {
        send({ event: "error", data: { message: err instanceof Error ? err.message : "Unknown error" } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

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
      urls.push(...parseJsonUrls(field));
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
      urls.push(...parseJsonUrls(field));
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
