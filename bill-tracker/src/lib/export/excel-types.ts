import ExcelJS from "exceljs";

export interface ExpenseData {
  documentCode?: string | null;
  billDate: Date;
  vendorName?: string | null;
  vendorTaxId?: string | null;
  description?: string | null;
  category?: string | null;
  payerCompanyName?: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  isWht: boolean;
  whtRate: number | null;
  whtAmount: number | null;
  netPaid: number;
  status: string;
  invoiceNumber?: string | null;
}

export interface IncomeData {
  documentCode?: string | null;
  receiveDate: Date;
  customerName?: string | null;
  customerTaxId?: string | null;
  source?: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  isWhtDeducted: boolean;
  whtRate: number | null;
  whtAmount: number | null;
  netReceived: number;
  status: string;
  invoiceNumber?: string | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "วัตถุดิบ",
  UTILITY: "สาธารณูปโภค",
  MARKETING: "การตลาด",
  SALARY: "เงินเดือน",
  FREELANCE: "ค่าจ้างฟรีแลนซ์",
  TRANSPORT: "ค่าขนส่ง",
  RENT: "ค่าเช่า",
  OFFICE: "สำนักงาน",
  OTHER: "อื่นๆ",
};

export const STATUS_LABELS: Record<string, string> = {
  WAITING_FOR_DOC: "รอใบเสร็จ",
  PENDING_PHYSICAL: "รอส่งบัญชี",
  READY_TO_SEND: "พร้อมส่ง",
  SENT_TO_ACCOUNT: "ส่งแล้ว",
  NO_DOC_REQUIRED: "ไม่ต้องทำเอกสาร",
  WAITING_ISSUE: "รอออกบิล",
  WAITING_WHT_CERT: "รอใบ 50 ทวิ",
  PENDING_COPY_SEND: "รอส่งสำเนา",
  SENT_COPY: "ส่งแล้ว",
};

export function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
}

export function styleNumericColumns(sheet: ExcelJS.Worksheet, keys: string[]): void {
  const validKeys = new Set(
    (sheet.columns || []).map((c) => c.key).filter(Boolean),
  );
  keys.forEach((key) => {
    if (!validKeys.has(key)) return;
    const col = sheet.getColumn(key);
    col.numFmt = "#,##0.00";
    col.alignment = { horizontal: "right" };
  });
}
