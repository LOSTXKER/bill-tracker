export interface AccountingRow {
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface ColumnMapping {
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: string;
  vatAmount: string;
}

export type ImportStep = "choose" | "mapping" | "preview" | "manual" | "pdf-loading";

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: "วัน/เดือน/ปี",
  invoiceNumber: "เลขที่ใบกำกับ",
  vendorName: "ชื่อผู้ขาย/ผู้ให้บริการ",
  taxId: "เลขประจำตัวผู้เสียภาษี",
  baseAmount: "มูลค่าสินค้า/บริการ",
  vatAmount: "จำนวนเงินภาษี",
};

export const THAI_COLUMN_HINTS: Record<string, keyof ColumnMapping> = {
  "วัน": "date",
  "วันที่": "date",
  "date": "date",
  "เลขที่ใบกำกับ": "invoiceNumber",
  "เลขที่": "invoiceNumber",
  "invoice": "invoiceNumber",
  "ชื่อผู้ขาย": "vendorName",
  "ชื่อ": "vendorName",
  "ผู้ขาย": "vendorName",
  "vendor": "vendorName",
  "เลขประจำตัว": "taxId",
  "taxid": "taxId",
  "tax": "taxId",
  "มูลค่าสินค้า": "baseAmount",
  "มูลค่า": "baseAmount",
  "amount": "baseAmount",
  "ภาษี": "vatAmount",
  "vat": "vatAmount",
};

export const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, "").trim();
  return parseFloat(cleaned) || 0;
}

export function parseDate(val: string): string {
  if (!val) return "";
  const parts = String(val).split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [d, m, y] = parts.map((p) => p.trim());
    if (parseInt(y) > 2500) y = String(parseInt(y) - 543);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return val;
}
