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
    totalAmount?: number;
    date: string;
    taxId?: string;
    invoiceNumber?: string;
    description?: string;
    type: "expense" | "income";
  }>;
  accountingItems: Array<{
    index: number;
    vendorName: string;
    amount: number;
    vatAmount: number;
    totalAmount?: number;
    date: string;
    taxId?: string;
    invoiceNumber?: string;
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
  | { event: "debug"; data: { rawResponse: string } }
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
              const visionPrompt = `อ่านเอกสารนี้อย่างละเอียด ดึงข้อมูลทั้งหมดต่อไปนี้:
- ชื่อผู้ขาย/ผู้ให้บริการ (ทุกชื่อที่ปรากฏ ทั้งชื่อบริษัท ชื่อร้าน ชื่อบุคคล)
- เลขประจำตัวผู้เสียภาษี (Tax ID)
- เลขที่ใบกำกับภาษี / เลขที่เอกสาร
- ยอดก่อน VAT, ยอด VAT, ยอดรวมทั้งสิ้น
- วันที่ในเอกสาร
- รายละเอียดสินค้า/บริการ

ตอบเป็นรูปแบบนี้เท่านั้น:
ชื่อ: ...
taxId: ...
เลขที่: ...
ยอด: ... VAT: ... รวม: ...
วันที่: ...
รายละเอียด: ...`;

              const result = await analyzeImage(
                url,
                visionPrompt,
                { timeoutMs: 30_000, maxTokens: 800, retries: 1 }
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
            const s = systemItems.find((si) => si.id === d.systemId);
            const parts = [`รายการ id="${d.systemId}"`];
            if (s) {
              parts.push(`ชื่อผู้ขาย="${s.vendorName}"`);
              parts.push(`ยอดก่อนVAT=${s.amount} VAT=${s.vatAmount} รวม=${s.totalAmount ?? ""}`);
              if (s.invoiceNumber) parts.push(`เลขที่เอกสาร="${s.invoiceNumber}"`);
              if (s.description) parts.push(`รายละเอียด="${s.description}"`);
              if (s.taxId) parts.push(`taxId="${s.taxId}"`);
              parts.push(`วันที่=${s.date}`);
            }
            return parts.join(" | ") + `\n  ข้อมูลจากเอกสารแนบ:\n  ${d.extractedInfo}`;
          })
          .join("\n\n");

        const acctList = accountingItems
          .map((a) => {
            const parts = [`[${a.index}]`];
            parts.push(`ชื่อ="${a.vendorName}"`);
            parts.push(`ยอด=${a.amount} VAT=${a.vatAmount} รวม=${a.totalAmount ?? ""}`);
            if (a.invoiceNumber) parts.push(`เลขที่="${a.invoiceNumber}"`);
            parts.push(`วันที่=${a.date}`);
            if (a.taxId) parts.push(`taxId="${a.taxId}"`);
            return parts.join(" | ");
          })
          .join("\n");

        const prompt = `คุณเป็นผู้เชี่ยวชาญด้านบัญชีภาษีไทย ช่วยจับคู่รายการระบบกับรายงานบัญชี โดยใช้ข้อมูลจากเอกสารแนบ (ใบกำกับภาษี, สลิป, หนังสือรับรอง ฯลฯ)

## กฎการจับคู่ (สำคัญมาก)

**สัญญาณหลัก (Primary) — ตรงอันใดอันหนึ่ง = confidence สูง:**
1. เลขประจำตัวผู้เสียภาษี (Tax ID) ตรงกัน
2. เลขที่ใบกำกับภาษี / เลขที่เอกสาร ตรงกัน

**สัญญาณรอง (Secondary) — ใช้ประกอบ:**
3. ยอดเงินใกล้เคียง (ต่างได้ไม่เกิน 5% — อาจต่างเพราะหัก ณ ที่จ่าย 1-3%, ปัดเศษ, หรือคนบันทึกใส่ยอดรวมแทนยอดก่อน VAT)
4. ชื่อผู้ขาย/ผู้ติดต่อคล้ายกัน (อาจย่อ อาจสะกดต่าง อาจเป็นชื่อบริษัทกับชื่อบุคคล)
5. วันที่ใกล้เคียง (ต่างได้ไม่เกิน 30 วัน)
6. รายละเอียดสินค้า/บริการที่เกี่ยวข้องกัน

**หลักการ:**
- ผู้ขายเดียวกันอาจมีหลายรายการ → ต้องดูเลขที่เอกสารหรือยอดเงินประกอบ
- ถ้ามีความเป็นไปได้แม้ต่ำ ให้ส่งมา พร้อมระบุ confidence ต่ำ (ดีกว่าไม่ส่งเลย)
- confidence: 0.9+ = tax ID + เลขที่ตรง, 0.7-0.9 = ยอดใกล้เคียง + ชื่อคล้าย, 0.4-0.7 = มีสัญญาณบางอย่างตรง, <0.4 = เดาจากข้อมูลน้อย

## ข้อมูลรายการระบบ (พร้อมเอกสารแนบที่ AI อ่านแล้ว):
${docContext}

## รายการจากรายงานบัญชี (ที่ยังไม่จับคู่):
${acctList}

## คำตอบ
ส่งคืน JSON array เท่านั้น (ไม่ต้องมี markdown code block):
[
  {
    "systemId": "id ของรายการระบบ",
    "accountingIndex": index ของรายการบัญชี (ตัวเลข),
    "confidence": 0.0-1.0,
    "reason": "เหตุผลสั้นๆ ภาษาไทย ระบุว่าตรงจากอะไร เช่น tax ID ตรง / เลขที่ใบกำกับตรง / ยอดใกล้เคียง"
  }
]`;

        const response = await generateText(prompt, { maxTokens: 4096 });

        send({ event: "debug", data: { rawResponse: response.data?.slice(0, 2000) ?? "(empty)" } });

        let suggestions: Array<{
          systemId: string;
          accountingIndex: number;
          confidence: number;
          reason: string;
        }> = [];

        try {
          const raw = response.data ?? "";
          const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");
          const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
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
