import { analyzeImage } from "@/lib/ai/gemini";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiError, ApiErrors } from "@/lib/api/errors";

export interface ExtractedRow {
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

const MAX_PDF_SIZE_MB = 10;

async function attemptExtraction(
  base64: string,
  prompt: string,
  label: string
): Promise<{ rows: ExtractedRow[]; rawResponse: string }> {
  const response = await analyzeImage(base64, prompt, {
    mimeType: "application/pdf",
    temperature: 0.1,
    maxTokens: 8192,
  });

  if (response.error || !response.data) {
    console.error(`[extract-pdf][${label}] AI error:`, response.error);
    return { rows: [], rawResponse: response.error ?? "" };
  }

  console.log(`[extract-pdf][${label}] response length: ${response.data.length}`);
  console.log(`[extract-pdf][${label}] response preview:`, response.data.substring(0, 800));

  const rows = parseAIResponse(response.data);
  console.log(`[extract-pdf][${label}] parsed ${rows.length} rows`);
  return { rows, rawResponse: response.data };
}

export const POST = withCompanyAccessFromParams(
  async (request) => {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw ApiErrors.badRequest("ไม่พบไฟล์ PDF");
    }

    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      throw ApiErrors.badRequest(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_PDF_SIZE_MB} MB)`);
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Attempt 1: structured prompt
    const attempt1 = await attemptExtraction(base64, buildExtractionPrompt(), "attempt1");
    if (attempt1.rows.length > 0) {
      return apiResponse.success({ rows: attempt1.rows });
    }

    // Attempt 2: simpler fallback prompt (different wording often helps)
    console.log("[extract-pdf] Attempt 1 found 0 rows, retrying with fallback prompt...");
    const attempt2 = await attemptExtraction(base64, buildFallbackPrompt(), "attempt2");
    if (attempt2.rows.length > 0) {
      return apiResponse.success({ rows: attempt2.rows });
    }

    // Both attempts failed — build a helpful error
    const lastResponse = attempt2.rawResponse || attempt1.rawResponse;
    const preview = lastResponse.substring(0, 300).replace(/\n/g, " ");
    console.error("[extract-pdf] Both attempts failed. Last AI response:", lastResponse.substring(0, 1000));

    throw new ApiError(
      422,
      `ไม่สามารถอ่านข้อมูลภาษีจาก PDF ได้ กรุณาตรวจสอบว่า PDF มีตารางข้อมูล (AI response: "${preview}...")`,
      "NO_DATA_FOUND"
    );
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }
);

function buildExtractionPrompt(): string {
  return `You are an expert at reading Thai tax reports. Extract ALL data rows from the tables in this PDF document.

This PDF is a Thai VAT report (รายงานภาษีซื้อ or รายงานภาษีขาย) or a purchase/sales listing from accounting software (e.g., Express, PEAK, FlowAccount, SAP, etc.).

Look for ANY table that contains financial transaction data with columns like:
- Date (วันที่, วัน/เดือน/ปี)
- Invoice number (เลขที่ใบกำกับภาษี, เลขที่)
- Name (ชื่อผู้ขาย, ชื่อผู้ให้บริการ, ชื่อลูกค้า, รายการ)
- Tax ID (เลขประจำตัวผู้เสียภาษี)
- Amount/Base (มูลค่าสินค้า, มูลค่า, ยอดก่อน VAT)
- VAT amount (ภาษีมูลค่าเพิ่ม, ภาษี, VAT)
- Total (รวม)

Rules:
1. Convert dates to YYYY-MM-DD. Buddhist Era years (พ.ศ., > 2500) → subtract 543.
2. Amounts as plain numbers (no commas). Missing = 0.
3. Skip headers, totals (รวม/Total/ยกมา/ยกไป), and blank rows.
4. If a vendor name wraps across multiple lines, merge into one entry.
5. Extract from ALL pages.
6. If totalAmount is missing, compute baseAmount + vatAmount.

Respond with ONLY a valid JSON array. No markdown fences, no explanation text:
[{"date":"YYYY-MM-DD","invoiceNumber":"","vendorName":"","taxId":"","baseAmount":0,"vatAmount":0,"totalAmount":0}]`;
}

function buildFallbackPrompt(): string {
  return `Look at this PDF document carefully. Find any table or list of financial transactions.

For each row/entry you find, extract:
- date (convert to YYYY-MM-DD, if Thai Buddhist year like 2567/2568/2569 subtract 543)
- invoiceNumber (any reference/invoice number)
- vendorName (company or person name)
- taxId (13-digit Thai tax ID if present)
- baseAmount (amount before tax)
- vatAmount (tax amount, usually 7%)
- totalAmount (total including tax)

Return a JSON array only. Example format:
[{"date":"2026-02-15","invoiceNumber":"IV-001","vendorName":"บริษัท ตัวอย่าง จำกัด","taxId":"0105500000001","baseAmount":1000,"vatAmount":70,"totalAmount":1070}]

If the document contains any transactions, invoices, or financial entries at all, extract them even if the format is non-standard. Return [] only if the document truly has no financial data.`;
}

function cleanJsonText(text: string): string {
  let cleaned = text.trim();

  // Strip ALL markdown code fences (even nested/multiple)
  cleaned = cleaned.replace(/```(?:json|JSON)?\s*\n?/g, "");

  // Remove leading/trailing non-JSON prose
  // Find the first [ or { and the last ] or }
  const firstBracket = cleaned.search(/[\[{]/);
  const lastBracket = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  return cleaned.trim();
}

function parseAIResponse(text: string): ExtractedRow[] {
  try {
    const cleaned = cleanJsonText(text);
    if (!cleaned) {
      console.log("[extract-pdf] cleanJsonText returned empty");
      return [];
    }

    let raw: unknown;

    // Strategy 1: direct parse
    try {
      raw = JSON.parse(cleaned);
    } catch (e1) {
      console.log("[extract-pdf] Direct parse failed:", (e1 as Error).message);

      // Strategy 2: find the outermost JSON array
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          raw = JSON.parse(arrayMatch[0]);
        } catch (e2) {
          console.log("[extract-pdf] Array extract parse failed:", (e2 as Error).message);

          // Strategy 3: try to find individual JSON objects and collect them
          const objects: unknown[] = [];
          const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
          let match;
          while ((match = objRegex.exec(cleaned)) !== null) {
            try {
              objects.push(JSON.parse(match[0]));
            } catch {
              // skip malformed objects
            }
          }
          if (objects.length > 0) {
            raw = objects;
          } else {
            console.log("[extract-pdf] No parseable JSON found in response");
            return [];
          }
        }
      } else {
        // Strategy 3 again: individual objects
        const objects: unknown[] = [];
        const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        let match;
        while ((match = objRegex.exec(cleaned)) !== null) {
          try {
            objects.push(JSON.parse(match[0]));
          } catch {
            // skip
          }
        }
        if (objects.length > 0) {
          raw = objects;
        } else {
          return [];
        }
      }
    }

    const items = Array.isArray(raw) ? raw : [raw];
    if (items.length === 0) return [];

    return items
      .filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item)
      )
      .map((item) => {
        const base = toNum(item.baseAmount ?? item.base_amount ?? item.amount ?? item["มูลค่า"] ?? 0);
        const vat = toNum(item.vatAmount ?? item.vat_amount ?? item.vat ?? item["ภาษี"] ?? 0);
        const total = toNum(item.totalAmount ?? item.total_amount ?? item.total ?? item["รวม"] ?? 0);

        return {
          date: toStr(item.date ?? item["วันที่"] ?? ""),
          invoiceNumber: toStr(item.invoiceNumber ?? item.invoice_number ?? item["เลขที่ใบกำกับ"] ?? item["เลขที่"] ?? ""),
          vendorName: toStr(item.vendorName ?? item.vendor_name ?? item.name ?? item["ชื่อ"] ?? item["ชื่อผู้ขาย"] ?? ""),
          taxId: toStr(item.taxId ?? item.tax_id ?? item["เลขประจำตัว"] ?? "").replace(/\D/g, ""),
          baseAmount: base,
          vatAmount: vat,
          totalAmount: total || base + vat,
        };
      })
      .filter((r: ExtractedRow) => r.vendorName || r.baseAmount > 0);
  } catch (e) {
    console.error("[extract-pdf] parseAIResponse crashed:", e);
    return [];
  }
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const cleaned = String(v).replace(/,/g, "").trim();
  return parseFloat(cleaned) || 0;
}
