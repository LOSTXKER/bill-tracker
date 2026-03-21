import { extractText } from "unpdf";
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

    // Strategy 1: Extract text from PDF and parse with regex (fast, free)
    const textRows = await extractFromText(buffer);
    if (textRows.length > 0) {
      console.log(`[extract-pdf] Text parse succeeded: ${textRows.length} rows`);
      return apiResponse.success({ rows: textRows });
    }

    // Strategy 2: Fallback to AI for scanned/image PDFs
    console.log("[extract-pdf] Text parse found 0 rows, falling back to AI...");
    const aiRows = await extractWithAI(buffer);
    if (aiRows.length > 0) {
      console.log(`[extract-pdf] AI fallback succeeded: ${aiRows.length} rows`);
      return apiResponse.success({ rows: aiRows });
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
// Strategy 1: Text-based extraction (pdf-parse + regex)
// ---------------------------------------------------------------------------

async function extractFromText(buffer: Buffer): Promise<ExtractedRow[]> {
  try {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });

    if (!text || text.trim().length < 50) return [];

    console.log(`[extract-pdf] PDF text length: ${text.length}`);

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows: ExtractedRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const row = tryParseLine(line, lines, i);
      if (row) rows.push(row);
    }

    return rows;
  } catch (e) {
    console.error("[extract-pdf] pdf-parse error:", e);
    return [];
  }
}

// Match Thai date: dd/mm/yyyy or dd/mm/yy (พ.ศ. or ค.ศ.)
const DATE_RE = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;

// Match 13-digit tax ID
const TAX_ID_RE = /(\d{13})/;

// Match money amounts like 1,234.56 or 1234.56
const MONEY_RE = /[\d,]+\.\d{2}/g;

function tryParseLine(
  line: string,
  _lines: string[],
  _idx: number,
): ExtractedRow | null {
  // Must contain a date to be a data row
  const dateMatch = line.match(DATE_RE);
  if (!dateMatch) return null;

  // Must contain at least one money amount
  const moneyMatches = line.match(MONEY_RE);
  if (!moneyMatches || moneyMatches.length === 0) return null;

  // Skip header/total/summary rows
  const lower = line.toLowerCase();
  if (
    lower.includes("รวม") ||
    lower.includes("total") ||
    lower.includes("ยกมา") ||
    lower.includes("ยกไป") ||
    lower.includes("หน้า") ||
    lower.includes("page")
  ) {
    return null;
  }

  // Parse date
  const date = parseThaiDate(dateMatch[1], dateMatch[2], dateMatch[3]);

  // Parse tax ID
  const taxIdMatch = line.match(TAX_ID_RE);
  const taxId = taxIdMatch ? taxIdMatch[1] : "";

  // Parse money amounts (take last 2-3 values as baseAmount, vatAmount, totalAmount)
  const amounts = moneyMatches.map(parseMoney);

  let baseAmount = 0;
  let vatAmount = 0;
  let totalAmount = 0;

  if (amounts.length >= 3) {
    // Last 3 amounts are typically: base, vat, total
    baseAmount = amounts[amounts.length - 3];
    vatAmount = amounts[amounts.length - 2];
    totalAmount = amounts[amounts.length - 1];
  } else if (amounts.length === 2) {
    baseAmount = amounts[0];
    vatAmount = amounts[1];
    totalAmount = baseAmount + vatAmount;
  } else if (amounts.length === 1) {
    totalAmount = amounts[0];
  }

  // Extract vendor name: text between date/invoice area and tax ID / amounts
  const vendorName = extractVendorName(line, dateMatch, taxIdMatch, moneyMatches);

  if (!vendorName && baseAmount === 0) return null;

  // Extract invoice number (pattern like RT-xxx, IV-xxx, INV-xxx, or alphanumeric codes)
  const invoiceNumber = extractInvoiceNumber(line, dateMatch);

  return {
    date,
    invoiceNumber,
    vendorName,
    taxId,
    baseAmount,
    vatAmount,
    totalAmount,
  };
}

function parseThaiDate(d: string, m: string, y: string): string {
  let year = parseInt(y);
  const month = parseInt(m);
  const day = parseInt(d);

  // 2-digit year
  if (year < 100) {
    year += year > 50 ? 1900 + 543 : 2000 + 543;
  }

  // Buddhist Era → Gregorian
  if (year > 2400) {
    year -= 543;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMoney(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function extractVendorName(
  line: string,
  dateMatch: RegExpMatchArray,
  taxIdMatch: RegExpMatchArray | null,
  moneyMatches: RegExpMatchArray,
): string {
  // Find the region between structured data (dates, IDs, amounts) and extract Thai text
  const dateEnd = (dateMatch.index ?? 0) + dateMatch[0].length;

  // Find where the amounts start
  const firstMoneyIdx = line.indexOf(moneyMatches[0]);
  const endBound = taxIdMatch
    ? Math.min(taxIdMatch.index ?? firstMoneyIdx, firstMoneyIdx)
    : firstMoneyIdx;

  // The vendor name region is roughly between the date area and the amounts/taxID
  let region = line.substring(dateEnd, endBound).trim();

  // Clean up: remove invoice-like codes and common prefixes
  region = region
    .replace(/[A-Z]{1,5}[-\s]?\d{5,}/g, "")   // invoice numbers
    .replace(/\d{13}/g, "")                      // tax IDs
    .replace(/HQ|สำนักงานใหญ่/g, "")            // branch labels
    .replace(/\(\d+\)/g, "")                     // (00000)
    .replace(/\s{2,}/g, " ")
    .trim();

  // If too short or just numbers, skip
  if (region.length < 3) return "";

  // Try to find the Thai company name within the region
  const thaiNameMatch = region.match(/((?:บริษัท|ห้างหุ้นส่วน|ร้าน|นาย|นาง|น\.ส\.)[\s\S]*?(?:จำกัด(?:\s*\(มหาชน\))?|$))/);
  if (thaiNameMatch) return thaiNameMatch[1].trim();

  return region;
}

function extractInvoiceNumber(line: string, dateMatch: RegExpMatchArray): string {
  const afterDate = line.substring((dateMatch.index ?? 0) + dateMatch[0].length);

  // Common invoice patterns
  const patterns = [
    /([A-Z]{1,5}[-]?\d{6,})/,           // RT-20260128000056, INV2602000001
    /([A-Z]{2,}\d{2,}[-\/]\d+)/,         // IV-2026/001
    /(\d{4,}[-\/]\d{4,})/,               // 2606-BR1550-000035
    /(ET-IV-\d+)/,                        // ET-IV-2026021481
    /([A-Z]+\d+CM\d+[-\/]\d+[-\/]\d+)/,  // DRCPV03CM159/2602/0497
    /(B\d+[-]P\d+[-]\d+)/,               // B0231-P02-2602020010
  ];

  for (const pattern of patterns) {
    const match = afterDate.match(pattern);
    if (match) return match[1];
  }

  return "";
}

// ---------------------------------------------------------------------------
// Strategy 2: AI fallback (for scanned PDFs)
// ---------------------------------------------------------------------------

const AI_PROMPT = `อ่านตารางใน PDF นี้ แล้ว extract ข้อมูลทุกแถว (ข้ามแถวหัวตาราง แถวรวม และแถวว่าง)

ส่งคืนเป็น JSON array เท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่ markdown:
[{"date":"YYYY-MM-DD","invoiceNumber":"","vendorName":"","taxId":"","baseAmount":0,"vatAmount":0,"totalAmount":0}]

- วันที่แปลงเป็น YYYY-MM-DD (ถ้าเป็น พ.ศ. ให้ลบ 543)
- ตัวเลขเงินไม่ต้องมีจุลภาค`;

async function extractWithAI(buffer: Buffer): Promise<ExtractedRow[]> {
  try {
    const base64 = buffer.toString("base64");
    const response = await analyzeImage(base64, AI_PROMPT, {
      mimeType: "application/pdf",
      temperature: 0,
      maxTokens: 32_768,
      timeoutMs: 180_000,
      retries: 2,
    });

    if (response.error || !response.data) {
      console.error("[extract-pdf] AI error:", response.error);
      return [];
    }

    return parseAIResponse(response.data);
  } catch (e) {
    console.error("[extract-pdf] AI extraction failed:", e);
    return [];
  }
}

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
