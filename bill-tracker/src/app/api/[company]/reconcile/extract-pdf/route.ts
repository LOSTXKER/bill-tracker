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

const PROMPT = `อ่านตารางใน PDF นี้ แล้ว extract ข้อมูลทุกแถว (ข้ามแถวหัวตาราง แถวรวม และแถวว่าง)

ส่งคืนเป็น JSON array เท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่ markdown:
[{"date":"YYYY-MM-DD","invoiceNumber":"","vendorName":"","taxId":"","baseAmount":0,"vatAmount":0,"totalAmount":0}]

- วันที่แปลงเป็น YYYY-MM-DD (ถ้าเป็น พ.ศ. ให้ลบ 543)
- ตัวเลขเงินไม่ต้องมีจุลภาค`;

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

    const response = await analyzeImage(base64, PROMPT, {
      mimeType: "application/pdf",
      temperature: 0,
      maxTokens: 32_768,
      timeoutMs: 180_000,
      retries: 2,
    });

    console.log("[extract-pdf] error:", response.error ?? "none");
    console.log("[extract-pdf] data length:", response.data?.length ?? 0);
    console.log("[extract-pdf] data preview:", response.data?.substring(0, 500));

    if (response.error || !response.data) {
      throw new ApiError(
        422,
        "AI ไม่สามารถอ่าน PDF ได้: " + (response.error ?? "ไม่มีข้อมูล"),
        "AI_EXTRACTION_FAILED"
      );
    }

    const rows = parseAIResponse(response.data);

    if (rows.length === 0) {
      const preview = response.data.substring(0, 200).replace(/\n/g, " ");
      throw new ApiError(
        422,
        `ไม่พบข้อมูลใน PDF (AI ตอบ: "${preview}")`,
        "NO_DATA_FOUND"
      );
    }

    return apiResponse.success({ rows });
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }
);

function parseAIResponse(text: string): ExtractedRow[] {
  try {
    let cleaned = text.trim();

    // Strip markdown fences
    cleaned = cleaned.replace(/```(?:json|JSON)?\s*\n?/g, "").trim();

    // Find the start of JSON array
    const start = cleaned.indexOf("[");
    if (start === -1) {
      console.error("[extract-pdf] No JSON array found in response");
      return [];
    }
    cleaned = cleaned.substring(start);

    // Try parsing as-is first
    let raw: unknown[];
    try {
      raw = JSON.parse(cleaned);
    } catch {
      // Response likely truncated — repair by finding last complete object
      const lastCompleteObj = cleaned.lastIndexOf("}");
      if (lastCompleteObj === -1) return [];

      const repaired = cleaned.substring(0, lastCompleteObj + 1) + "]";
      console.log("[extract-pdf] JSON truncated, repaired by closing array after last complete object");
      try {
        raw = JSON.parse(repaired);
      } catch {
        // Still broken — try extracting individual objects
        console.log("[extract-pdf] Repaired JSON still invalid, extracting individual objects");
        raw = [];
        const objRegex = /\{[^{}]+\}/g;
        let match;
        while ((match = objRegex.exec(cleaned)) !== null) {
          try { raw.push(JSON.parse(match[0])); } catch { /* skip */ }
        }
      }
    }

    if (!Array.isArray(raw) || raw.length === 0) return [];

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
  } catch (e) {
    console.error("[extract-pdf] JSON parse error:", e);
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
