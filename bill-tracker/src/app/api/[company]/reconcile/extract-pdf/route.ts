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

export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
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

    const prompt = buildExtractionPrompt();

    const response = await analyzeImage(base64, prompt, {
      mimeType: "application/pdf",
      temperature: 0.1,
      maxTokens: 8192,
    });

    if (response.error || !response.data) {
      throw new ApiError(
        422,
        "AI ไม่สามารถอ่าน PDF ได้: " + (response.error ?? "ไม่มีข้อมูล"),
        "AI_EXTRACTION_FAILED"
      );
    }

    console.log("[extract-pdf] AI raw response length:", response.data.length);
    console.log("[extract-pdf] AI raw response (first 500 chars):", response.data.substring(0, 500));

    const rows = parseAIResponse(response.data);

    if (rows.length === 0) {
      const hint = extractAIExplanation(response.data);
      throw new ApiError(
        422,
        hint
          ? `AI ไม่พบตารางภาษีใน PDF: ${hint}`
          : "ไม่พบตารางข้อมูลภาษีใน PDF นี้ กรุณาตรวจสอบว่าไฟล์มีตาราง (ไม่ใช่ scan/รูปภาพ) แล้วลองอีกครั้ง",
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

function buildExtractionPrompt(): string {
  return `You are an expert at reading Thai tax reports (รายงานภาษีซื้อ/ภาษีขาย). Extract ALL data rows from every table in this PDF.

This PDF may contain a Thai VAT input/output tax report (ภ.พ.30, รายงานภาษีซื้อ, รายงานภาษีขาย) or a purchase/sales report from accounting software. The table columns may be labeled differently depending on the software, but typically include:

- ลำดับที่ / No. (row number — skip this)
- วัน เดือน ปี / วันที่ (date)
- เลขที่ใบกำกับภาษี / Invoice No.
- ชื่อผู้ขายสินค้า/ผู้ให้บริการ / ชื่อลูกค้า / รายการ / ที่
- เลขประจำตัวผู้เสียภาษีอากร / Tax ID
- สถานประกอบการ (branch — skip)
- มูลค่าสินค้าหรือบริการ / ยอดก่อน VAT / Amount
- จำนวนเงินภาษี / VAT
- รวม / Total / หมายเหตุ

IMPORTANT RULES:
1. Date format: Convert to YYYY-MM-DD. If the year is Buddhist Era (> 2500, e.g., 2569), subtract 543.
2. Amounts: Numbers only, no commas. Use 0 if not available.
3. SKIP header rows, subtotal rows, total rows (รวม, Total, ยกมา, ยกไป), and empty rows.
4. If the same vendor appears on multiple lines (wrapped text), merge them into one row.
5. If the PDF has multiple pages, extract from ALL pages.
6. If a column is missing entirely, use empty string or 0.
7. Even if the table layout is unusual, do your best to extract the data.

Return ONLY a JSON array (no explanation, no markdown):
[
  {
    "date": "YYYY-MM-DD",
    "invoiceNumber": "invoice number or empty string",
    "vendorName": "company or person name",
    "taxId": "13-digit tax ID or empty string",
    "baseAmount": 0.00,
    "vatAmount": 0.00,
    "totalAmount": 0.00
  }
]

If you truly cannot find ANY table data in this PDF, respond with exactly: []`;
}

function cleanJsonText(text: string): string {
  let cleaned = text.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  return cleaned.trim();
}

function parseAIResponse(text: string): ExtractedRow[] {
  try {
    const cleaned = cleanJsonText(text);

    // Try parsing the cleaned text directly first (handles both [...] and {...} wrapped)
    let raw: unknown;
    try {
      raw = JSON.parse(cleaned);
    } catch {
      // Fallback: extract the first JSON array from the text
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        raw = JSON.parse(arrayMatch[0]);
      } else {
        // Last resort: try to find a single JSON object
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objMatch) {
          raw = [JSON.parse(objMatch[0])];
        } else {
          return [];
        }
      }
    }

    const items = Array.isArray(raw) ? raw : [raw];
    if (items.length === 0) return [];

    return items
      .map((item: Record<string, unknown>) => ({
        date: String(item.date ?? "").trim(),
        invoiceNumber: String(item.invoiceNumber ?? item.invoice_number ?? "").trim(),
        vendorName: String(item.vendorName ?? item.vendor_name ?? item.name ?? "").trim(),
        taxId: String(item.taxId ?? item.tax_id ?? "").replace(/\D/g, ""),
        baseAmount: parseFloat(String(item.baseAmount ?? item.base_amount ?? item.amount ?? "0")) || 0,
        vatAmount: parseFloat(String(item.vatAmount ?? item.vat_amount ?? item.vat ?? "0")) || 0,
        totalAmount: parseFloat(String(item.totalAmount ?? item.total_amount ?? item.total ?? "0")) || 0,
      }))
      .filter((r: ExtractedRow) => r.vendorName || r.baseAmount > 0);
  } catch (e) {
    console.error("[extract-pdf] Failed to parse AI response:", e);
    return [];
  }
}

function extractAIExplanation(text: string): string | null {
  const cleaned = text.trim();
  // If the response is short text without JSON, it's likely an explanation
  if (cleaned.length < 500 && !cleaned.includes("[") && !cleaned.includes("{")) {
    return cleaned.substring(0, 200);
  }
  return null;
}
