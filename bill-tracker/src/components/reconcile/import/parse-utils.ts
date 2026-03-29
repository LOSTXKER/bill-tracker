import {
  AccountingRow,
  ColumnMapping,
  THAI_COLUMN_HINTS,
  parseNumber,
  parseDate,
} from "./import-types";

export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { date: "", invoiceNumber: "", vendorName: "", taxId: "", baseAmount: "", vatAmount: "" };
  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    for (const [hint, field] of Object.entries(THAI_COLUMN_HINTS)) {
      if (lower.includes(hint.toLowerCase()) && !mapping[field]) {
        mapping[field] = h;
        break;
      }
    }
  });
  return mapping;
}

export async function parsePdfFile(
  file: File,
  companyCode: string
): Promise<{ rows: AccountingRow[] } | { error: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/${companyCode}/reconcile/extract-pdf`, { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: json.error ?? "ไม่สามารถอ่าน PDF ได้" };
    }
    return { rows: json.data.rows as AccountingRow[] };
  } catch {
    return { error: "เกิดข้อผิดพลาดในการส่งไฟล์ กรุณาลองใหม่" };
  }
}

export async function parseExcelFile(
  file: File
): Promise<{ headers: string[]; data: string[][]; mapping: ColumnMapping } | { error: string }> {
  try {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "dd/mm/yyyy" });

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i] as string[];
      if (row && row.some((cell) => typeof cell === "string" && cell.trim().length > 1)) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = (rows[headerRowIdx] as string[]).map((h) => String(h ?? "").trim()).filter(Boolean);
    const data = rows.slice(headerRowIdx + 1).filter((r) => {
      const row = r as string[];
      return row && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    }) as string[][];

    return { headers, data, mapping: autoDetectColumns(headers) };
  } catch {
    return { error: "ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบ Excel/CSV" };
  }
}

export function applyColumnMapping(
  rawHeaders: string[],
  rawData: string[][],
  columnMapping: ColumnMapping
): AccountingRow[] {
  return rawData
    .map((row) => {
      const get = (colName: string) => {
        const idx = rawHeaders.indexOf(colName);
        return idx >= 0 ? String(row[idx] ?? "").trim() : "";
      };
      const base = parseNumber(get(columnMapping.baseAmount));
      const vat = parseNumber(get(columnMapping.vatAmount));
      return {
        date: parseDate(get(columnMapping.date)),
        invoiceNumber: get(columnMapping.invoiceNumber),
        vendorName: get(columnMapping.vendorName),
        taxId: get(columnMapping.taxId),
        baseAmount: base,
        vatAmount: vat,
        totalAmount: base + vat,
      };
    })
    .filter((r) => r.vendorName || r.baseAmount > 0);
}
