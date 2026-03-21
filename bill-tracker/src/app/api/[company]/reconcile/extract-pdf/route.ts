import { extractText } from "unpdf";
import { generateText, analyzeImage } from "@/lib/ai/gemini";
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

const PARSE_PROMPT = `จาก text ที่ extract มาจาก PDF ด้านล่าง ให้ดึงข้อมูลทุกแถวของตาราง

ส่งคืนเป็น JSON array เท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่ markdown:
[{"date":"YYYY-MM-DD","invoiceNumber":"","vendorName":"","taxId":"","baseAmount":0,"vatAmount":0,"totalAmount":0}]

กฎ:
- วันที่แปลงเป็น YYYY-MM-DD (ถ้าเป็น พ.ศ. ให้ลบ 543)
- ตัวเลขเงินไม่ต้องมีจุลภาค
- ข้ามแถวหัวตาราง แถวรวม แถวว่าง

ข้อมูล text จาก PDF:
`;

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1: Extract text from PDF (instant, free)
    let pdfText = "";
    try {
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      pdfText = typeof text === "string" ? text : "";
      console.log(`[extract-pdf] Text extracted: ${pdfText.length} chars`);
    } catch (e) {
      console.error("[extract-pdf] Text extraction failed:", e);
    }

    // Step 2: If we got text, send it to AI as text (fast, no vision processing)
    if (pdfText.length > 50) {
      const rows = await extractWithTextAI(pdfText);
      if (rows.length > 0) {
        console.log(`[extract-pdf] Text+AI succeeded: ${rows.length} rows`);
        return apiResponse.success({ rows });
      }
    }

    // Step 3: Fallback — send PDF binary to vision AI (for scanned PDFs)
    console.log("[extract-pdf] Text approach failed, falling back to vision AI...");
    const rows = await extractWithVisionAI(buffer);
    if (rows.length > 0) {
      console.log(`[extract-pdf] Vision AI succeeded: ${rows.length} rows`);
      return apiResponse.success({ rows });
    }

    throw new ApiError(
      422,
      "ไม่พบตารางข้อมูลภาษีใน PDF นี้ กรุณาตรวจสอบไฟล์",
      "NO_DATA_FOUND"
    );
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }
);

// ---------------------------------------------------------------------------
// Strategy 1: Extract text → AI parses the text (fast, 2-5 seconds)
// ---------------------------------------------------------------------------

async function extractWithTextAI(pdfText: string): Promise<ExtractedRow[]> {
  try {
    const prompt = PARSE_PROMPT + pdfText;

    const response = await generateText(prompt, {
      temperature: 0,
      maxTokens: 32_768,
      retries: 2,
    });

    if (response.error || !response.data) {
      console.error("[extract-pdf] Text AI error:", response.error);
      return [];
    }

    return parseAIResponse(response.data);
  } catch (e) {
    console.error("[extract-pdf] Text AI failed:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: Vision AI on PDF binary (for scanned PDFs, slower)
// ---------------------------------------------------------------------------

async function extractWithVisionAI(buffer: Buffer): Promise<ExtractedRow[]> {
  try {
    const base64 = buffer.toString("base64");
    const response = await analyzeImage(base64, PARSE_PROMPT + "(ดูจาก PDF โดยตรง)", {
      mimeType: "application/pdf",
      temperature: 0,
      maxTokens: 32_768,
      timeoutMs: 180_000,
      retries: 2,
    });

    if (response.error || !response.data) {
      console.error("[extract-pdf] Vision AI error:", response.error);
      return [];
    }

    return parseAIResponse(response.data);
  } catch (e) {
    console.error("[extract-pdf] Vision AI failed:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Parse AI JSON response (handles truncated responses)
// ---------------------------------------------------------------------------

function parseAIResponse(text: string): ExtractedRow[] {
  try {
    let cleaned = text.trim().replace(/```(?:json|JSON)?\s*\n?/g, "").trim();

    const start = cleaned.indexOf("[");
    if (start === -1) return [];
    cleaned = cleaned.substring(start);

    let raw: unknown[];
    try {
      raw = JSON.parse(cleaned);
    } catch {
      // Truncated JSON — repair
      const lastObj = cleaned.lastIndexOf("}");
      if (lastObj === -1) return [];
      try {
        raw = JSON.parse(cleaned.substring(0, lastObj + 1) + "]");
      } catch {
        raw = [];
        const re = /\{[^{}]+\}/g;
        let m;
        while ((m = re.exec(cleaned)) !== null) {
          try { raw.push(JSON.parse(m[0])); } catch { /* skip */ }
        }
      }
    }

    if (!Array.isArray(raw)) return [];

    return raw
      .filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
      )
      .map((item) => {
        const base = toNum(item.baseAmount ?? item.base_amount ?? 0);
        const vat = toNum(item.vatAmount ?? item.vat_amount ?? 0);
        const total = toNum(item.totalAmount ?? item.total_amount ?? 0);
        return {
          date: toStr(item.date ?? ""),
          invoiceNumber: toStr(item.invoiceNumber ?? item.invoice_number ?? ""),
          vendorName: toStr(item.vendorName ?? item.vendor_name ?? item.name ?? ""),
          taxId: toStr(item.taxId ?? item.tax_id ?? "").replace(/\D/g, ""),
          baseAmount: base,
          vatAmount: vat,
          totalAmount: total || base + vat,
        };
      })
      .filter((r) => r.vendorName || r.baseAmount > 0);
  } catch {
    return [];
  }
}

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v).replace(/,/g, "")) || 0;
}
