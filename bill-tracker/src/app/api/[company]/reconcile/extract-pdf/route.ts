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

    if (pdfText.length > 50) {
      // Step 2a: Try direct text parsing (instant, no AI)
      const directRows = parseTextDirect(pdfText);
      if (directRows.length > 0) {
        console.log(`[extract-pdf] Direct parse succeeded: ${directRows.length} rows`);
        return apiResponse.success({ rows: directRows });
      }

      // Step 2b: Send text to AI for parsing (fast, 2-5s)
      console.log("[extract-pdf] Direct parse got 0, trying text AI...");
      const aiRows = await parseTextWithAI(pdfText);
      if (aiRows.length > 0) {
        console.log(`[extract-pdf] Text AI succeeded: ${aiRows.length} rows`);
        return apiResponse.success({ rows: aiRows });
      }
    }

    // Step 3: Vision AI fallback (for scanned PDFs)
    console.log("[extract-pdf] Text approaches failed, trying vision AI...");
    const visionRows = await parseWithVisionAI(buffer);
    if (visionRows.length > 0) {
      console.log(`[extract-pdf] Vision AI succeeded: ${visionRows.length} rows`);
      return apiResponse.success({ rows: visionRows });
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
// Strategy 1: Direct text parsing (instant, no AI, no cost)
// ---------------------------------------------------------------------------

const AMOUNTS_AT_END_RE = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;
const ROW_START_RE = /\b(\d{1,3})\s+(\d{1,2}\/\d{1,2}\/\d{4})/;
const INTERNAL_REF_RE = /^((?:EXP|PA|INV|REC|REV|JV)[-]?\w+)\s*/;
const BRANCH_TAIL_RE = /\s+(?:HQ\s*\(\d+\)\s*)?\d{5}\s*$/;
const TAX_ID_TAIL_RE = /\s+([\d][\d\-]*\d)\s*$/;

function normalizeText(text: string): string {
  if (text.split("\n").length >= 10) return text;

  // unpdf often returns a single line — split after each set of 3 amounts
  return text.replace(
    /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+/g,
    "$1 $2 $3\n"
  );
}

function parseTextDirect(text: string): ExtractedRow[] {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n");
  const rows: ExtractedRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, " ").trim();
    if (!line) continue;
    if (/(?:^|\s)รวม\s|\btotal\b|ยกมา|ยกไป/i.test(line)) continue;

    const amountsMatch = line.match(AMOUNTS_AT_END_RE);
    if (!amountsMatch) continue;

    const rowMatch = line.match(ROW_START_RE);
    if (!rowMatch) continue;

    const baseAmount = parseMoney(amountsMatch[1]);
    const vatAmount = parseMoney(amountsMatch[2]);
    const totalAmount = parseMoney(amountsMatch[3]);
    const date = convertDate(rowMatch[2]);

    // Core = between row start and amounts
    const core = line
      .substring(rowMatch.index! + rowMatch[0].length)
      .replace(AMOUNTS_AT_END_RE, "")
      .trim();

    // Find invoice date (dd/mm/yyyy) in core
    const coreDates = [...core.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}/g)];
    if (coreDates.length < 1) continue;

    const lastCoreDate = coreDates[coreDates.length - 1];
    const lastCoreDateEnd = lastCoreDate.index! + lastCoreDate[0].length;

    // Ref section: before the last date
    const refSection = core.substring(0, lastCoreDate.index!).trim();
    const refMatch = refSection.match(INTERNAL_REF_RE);
    const invoiceNumber = refMatch
      ? refSection.substring(refMatch[0].length).trim()
      : refSection.trim();

    // Vendor section: after the last date
    let vendorSection = core.substring(lastCoreDateEnd).trim();

    vendorSection = vendorSection.replace(BRANCH_TAIL_RE, "").trim();
    vendorSection = vendorSection.replace(/\s+HQ\s*\(\d+\)\s*$/, "").trim();

    let vendorName = vendorSection;
    let taxId = "";
    const taxIdMatch = vendorSection.match(TAX_ID_TAIL_RE);
    if (taxIdMatch) {
      taxId = taxIdMatch[1].replace(/-/g, "");
      vendorName = vendorSection.substring(0, taxIdMatch.index!).trim();
    }

    if (!vendorName && baseAmount === 0) continue;

    rows.push({ date, invoiceNumber, vendorName, taxId, baseAmount, vatAmount, totalAmount });
  }

  return rows;
}

function convertDate(dmy: string): string {
  const [d, m, y] = dmy.split("/").map(Number);
  const year = y > 2400 ? y - 543 : y;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseMoney(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

// ---------------------------------------------------------------------------
// Strategy 2: Text + AI (fast text-only, 2-5 seconds)
// ---------------------------------------------------------------------------

const AI_PROMPT = `จาก text ที่ extract มาจาก PDF ด้านล่าง ให้ดึงข้อมูลทุกแถวของตาราง

ส่งคืนเป็น JSON array เท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่ markdown:
[{"date":"YYYY-MM-DD","invoiceNumber":"","vendorName":"","taxId":"","baseAmount":0,"vatAmount":0,"totalAmount":0}]

กฎ:
- วันที่แปลงเป็น YYYY-MM-DD (ถ้าเป็น พ.ศ. ให้ลบ 543)
- ตัวเลขเงินไม่ต้องมีจุลภาค
- ข้ามแถวหัวตาราง แถวรวม แถวว่าง

ข้อมูล:
`;

async function parseTextWithAI(pdfText: string): Promise<ExtractedRow[]> {
  try {
    const response = await generateText(AI_PROMPT + pdfText, {
      temperature: 0,
      maxTokens: 32_768,
      retries: 2,
    });

    if (response.error || !response.data) {
      console.error("[extract-pdf] Text AI error:", response.error);
      return [];
    }

    return parseJSON(response.data);
  } catch (e) {
    console.error("[extract-pdf] Text AI failed:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Strategy 3: Vision AI fallback (for scanned PDFs)
// ---------------------------------------------------------------------------

async function parseWithVisionAI(buffer: Buffer): Promise<ExtractedRow[]> {
  try {
    const response = await analyzeImage(buffer, AI_PROMPT + "(ดูจาก PDF โดยตรง)", {
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

    return parseJSON(response.data);
  } catch (e) {
    console.error("[extract-pdf] Vision AI failed:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// JSON parser (handles truncated AI responses)
// ---------------------------------------------------------------------------

function parseJSON(text: string): ExtractedRow[] {
  try {
    let cleaned = text.trim().replace(/```(?:json|JSON)?\s*\n?/g, "").trim();

    const start = cleaned.indexOf("[");
    if (start === -1) return [];
    cleaned = cleaned.substring(start);

    let raw: unknown[];
    try {
      raw = JSON.parse(cleaned);
    } catch {
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
