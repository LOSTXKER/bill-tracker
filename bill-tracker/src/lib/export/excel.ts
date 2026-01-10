import ExcelJS from "exceljs";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface ExpenseData {
  billDate: Date;
  vendorName?: string | null;
  vendorTaxId?: string | null;
  description?: string | null;
  category?: string | null;
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

interface IncomeData {
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

const CATEGORY_LABELS: Record<string, string> = {
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

const STATUS_LABELS: Record<string, string> = {
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

export async function exportExpensesToExcel(
  expenses: ExpenseData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("รายจ่าย");

  // Set column widths
  worksheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "เลขที่ใบกำกับ", key: "invoiceNo", width: 15 },
    { header: "ผู้ขาย", key: "vendor", width: 25 },
    { header: "เลขภาษีผู้ขาย", key: "taxId", width: 15 },
    { header: "รายละเอียด", key: "description", width: 30 },
    { header: "บัญชี", key: "category", width: 15 },
    { header: "ยอดก่อน VAT", key: "amount", width: 15 },
    { header: "VAT %", key: "vatRate", width: 10 },
    { header: "VAT", key: "vat", width: 15 },
    { header: "WHT %", key: "whtRate", width: 10 },
    { header: "WHT", key: "wht", width: 15 },
    { header: "ยอดจ่ายจริง", key: "netPaid", width: 15 },
    { header: "สถานะ", key: "status", width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // Add data rows
  expenses.forEach((expense) => {
    worksheet.addRow({
      date: expense.billDate.toLocaleDateString("th-TH"),
      invoiceNo: expense.invoiceNumber || "-",
      vendor: expense.vendorName || "-",
      taxId: expense.vendorTaxId || "-",
      description: expense.description || "-",
      category: expense.category ? CATEGORY_LABELS[expense.category] || expense.category : "-",
      amount: Number(expense.amount),
      vatRate: expense.vatRate,
      vat: Number(expense.vatAmount) || 0,
      whtRate: expense.isWht ? Number(expense.whtRate) || 0 : 0,
      wht: expense.isWht ? Number(expense.whtAmount) || 0 : 0,
      netPaid: Number(expense.netPaid),
      status: STATUS_LABELS[expense.status] || expense.status,
    });
  });

  // Format number columns
  ["amount", "vat", "wht", "netPaid"].forEach((key) => {
    const col = worksheet.getColumn(key);
    col.numFmt = "#,##0.00";
    col.alignment = { horizontal: "right" };
  });

  // Add totals row
  const lastRow = worksheet.lastRow?.number || 1;
  const totalRow = worksheet.addRow({
    date: "",
    invoiceNo: "",
    vendor: "",
    taxId: "",
    description: "",
    category: "รวมทั้งหมด",
    amount: { formula: `SUM(G2:G${lastRow})` },
    vatRate: "",
    vat: { formula: `SUM(I2:I${lastRow})` },
    whtRate: "",
    wht: { formula: `SUM(K2:K${lastRow})` },
    netPaid: { formula: `SUM(L2:L${lastRow})` },
    status: "",
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportIncomesToExcel(
  incomes: IncomeData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("รายรับ");

  // Set column widths
  worksheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "เลขที่ใบกำกับ", key: "invoiceNo", width: 15 },
    { header: "ลูกค้า", key: "customer", width: 25 },
    { header: "เลขภาษีลูกค้า", key: "taxId", width: 15 },
    { header: "รายละเอียด", key: "source", width: 30 },
    { header: "ยอดก่อน VAT", key: "amount", width: 15 },
    { header: "VAT %", key: "vatRate", width: 10 },
    { header: "VAT", key: "vat", width: 15 },
    { header: "WHT %", key: "whtRate", width: 10 },
    { header: "WHT", key: "wht", width: 15 },
    { header: "ยอดรับจริง", key: "netReceived", width: 15 },
    { header: "สถานะ", key: "status", width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // Add data rows
  incomes.forEach((income) => {
    worksheet.addRow({
      date: income.receiveDate.toLocaleDateString("th-TH"),
      invoiceNo: income.invoiceNumber || "-",
      customer: income.customerName || "-",
      taxId: income.customerTaxId || "-",
      source: income.source || "-",
      amount: Number(income.amount),
      vatRate: income.vatRate,
      vat: Number(income.vatAmount) || 0,
      whtRate: income.isWhtDeducted ? Number(income.whtRate) || 0 : 0,
      wht: income.isWhtDeducted ? Number(income.whtAmount) || 0 : 0,
      netReceived: Number(income.netReceived),
      status: STATUS_LABELS[income.status] || income.status,
    });
  });

  // Format number columns
  ["amount", "vat", "wht", "netReceived"].forEach((key) => {
    const col = worksheet.getColumn(key);
    col.numFmt = "#,##0.00";
    col.alignment = { horizontal: "right" };
  });

  // Add totals row
  const lastRow = worksheet.lastRow?.number || 1;
  const totalRow = worksheet.addRow({
    date: "",
    invoiceNo: "",
    customer: "",
    taxId: "",
    source: "รวมทั้งหมด",
    amount: { formula: `SUM(F2:F${lastRow})` },
    vatRate: "",
    vat: { formula: `SUM(H2:H${lastRow})` },
    whtRate: "",
    wht: { formula: `SUM(J2:J${lastRow})` },
    netReceived: { formula: `SUM(K2:K${lastRow})` },
    status: "",
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportMonthlyReport(
  expenses: ExpenseData[],
  incomes: IncomeData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet("สรุป");
  summarySheet.columns = [
    { header: "รายการ", key: "item", width: 30 },
    { header: "จำนวนเงิน", key: "amount", width: 20 },
  ];

  let totalIncome = 0;
  for (const i of incomes) {
    totalIncome += Number(i.netReceived);
  }
  let totalExpense = 0;
  for (const e of expenses) {
    totalExpense += Number(e.netPaid);
  }
  const netCashFlow = totalIncome - totalExpense;

  summarySheet.addRow({
    item: `รายงานประจำเดือน ${period}`,
    amount: "",
  });
  summarySheet.addRow({ item: `บริษัท: ${companyName}`, amount: "" });
  summarySheet.addRow({ item: "", amount: "" });

  summarySheet.addRow({
    item: "รายรับรวม",
    amount: totalIncome,
  });
  summarySheet.addRow({
    item: "รายจ่ายรวม",
    amount: totalExpense,
  });
  summarySheet.addRow({
    item: "กระแสเงินสดสุทธิ",
    amount: netCashFlow,
  });

  // Style summary
  summarySheet.getColumn("amount").numFmt = "#,##0.00";
  summarySheet.getColumn("amount").alignment = { horizontal: "right" };

  // Expenses Sheet
  const expenseSheet = workbook.addWorksheet("รายจ่าย");
  expenseSheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "ผู้ขาย", key: "vendor", width: 25 },
    { header: "รายละเอียด", key: "description", width: 30 },
    { header: "บัญชี", key: "category", width: 15 },
    { header: "ยอดก่อน VAT", key: "amount", width: 15 },
    { header: "VAT", key: "vat", width: 15 },
    { header: "WHT", key: "wht", width: 15 },
    { header: "ยอดจ่ายจริง", key: "netPaid", width: 15 },
  ];

  expenses.forEach((expense) => {
    expenseSheet.addRow({
      date: expense.billDate.toLocaleDateString("th-TH"),
      vendor: expense.vendorName || "-",
      description: expense.description || "-",
      category: expense.category ? CATEGORY_LABELS[expense.category] || expense.category : "-",
      amount: Number(expense.amount),
      vat: Number(expense.vatAmount) || 0,
      wht: expense.isWht ? Number(expense.whtAmount) || 0 : 0,
      netPaid: Number(expense.netPaid),
    });
  });

  // Incomes Sheet
  const incomeSheet = workbook.addWorksheet("รายรับ");
  incomeSheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "ลูกค้า", key: "customer", width: 25 },
    { header: "รายละเอียด", key: "source", width: 30 },
    { header: "ยอดก่อน VAT", key: "amount", width: 15 },
    { header: "VAT", key: "vat", width: 15 },
    { header: "WHT", key: "wht", width: 15 },
    { header: "ยอดรับจริง", key: "netReceived", width: 15 },
  ];

  incomes.forEach((income) => {
    incomeSheet.addRow({
      date: income.receiveDate.toLocaleDateString("th-TH"),
      customer: income.customerName || "-",
      source: income.source || "-",
      amount: Number(income.amount),
      vat: Number(income.vatAmount) || 0,
      wht: income.isWhtDeducted ? Number(income.whtAmount) || 0 : 0,
      netReceived: Number(income.netReceived),
    });
  });

  // Style all sheets
  [expenseSheet, incomeSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Format number columns
    ["amount", "vat", "wht", "netPaid", "netReceived"].forEach((key) => {
      const col = sheet.getColumn(key);
      if (col) {
        col.numFmt = "#,##0.00";
        col.alignment = { horizontal: "right" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportVATReport(
  expenses: ExpenseData[],
  incomes: IncomeData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // VAT Summary
  const summarySheet = workbook.addWorksheet("สรุป VAT");

  let inputVAT = 0;
  for (const e of expenses) {
    inputVAT += Number(e.vatAmount) || 0;
  }
  let outputVAT = 0;
  for (const i of incomes) {
    outputVAT += Number(i.vatAmount) || 0;
  }
  const netVAT = outputVAT - inputVAT;

  summarySheet.columns = [
    { header: "รายการ", key: "item", width: 30 },
    { header: "จำนวนเงิน", key: "amount", width: 20 },
  ];

  summarySheet.addRow({ item: `รายงาน VAT ประจำ ${period}`, amount: "" });
  summarySheet.addRow({ item: `บริษัท: ${companyName}`, amount: "" });
  summarySheet.addRow({ item: "", amount: "" });
  summarySheet.addRow({ item: "ภาษีซื้อ (Input VAT)", amount: inputVAT });
  summarySheet.addRow({ item: "ภาษีขาย (Output VAT)", amount: outputVAT });
  summarySheet.addRow({ item: "", amount: "" });
  summarySheet.addRow({
    item: netVAT >= 0 ? "ภาษีที่ต้องนำส่ง" : "ภาษีที่ขอคืน",
    amount: Math.abs(netVAT),
  });

  summarySheet.getColumn("amount").numFmt = "#,##0.00";
  summarySheet.getColumn("amount").alignment = { horizontal: "right" };

  // Input VAT Details
  const inputSheet = workbook.addWorksheet("ภาษีซื้อ");
  inputSheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "เลขที่ใบกำกับ", key: "invoiceNo", width: 15 },
    { header: "ผู้ขาย", key: "vendor", width: 25 },
    { header: "เลขประจำตัวผู้เสียภาษี", key: "taxId", width: 18 },
    { header: "มูลค่าสินค้า", key: "amount", width: 15 },
    { header: "VAT 7%", key: "vat", width: 15 },
    { header: "รวม", key: "total", width: 15 },
  ];

  expenses.forEach((expense) => {
    inputSheet.addRow({
      date: expense.billDate.toLocaleDateString("th-TH"),
      invoiceNo: expense.invoiceNumber || "-",
      vendor: expense.vendorName || "-",
      taxId: expense.vendorTaxId || "-",
      amount: Number(expense.amount),
      vat: Number(expense.vatAmount) || 0,
      total: Number(expense.amount) + (Number(expense.vatAmount) || 0),
    });
  });

  // Output VAT Details
  const outputSheet = workbook.addWorksheet("ภาษีขาย");
  outputSheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "เลขที่ใบกำกับ", key: "invoiceNo", width: 15 },
    { header: "ลูกค้า", key: "customer", width: 25 },
    { header: "มูลค่าสินค้า", key: "amount", width: 15 },
    { header: "VAT 7%", key: "vat", width: 15 },
    { header: "รวม", key: "total", width: 15 },
  ];

  incomes.forEach((income) => {
    outputSheet.addRow({
      date: income.receiveDate.toLocaleDateString("th-TH"),
      invoiceNo: income.invoiceNumber || "-",
      customer: income.customerName || "-",
      amount: Number(income.amount),
      vat: Number(income.vatAmount) || 0,
      total: Number(income.amount) + (Number(income.vatAmount) || 0),
    });
  });

  // Style all sheets
  [inputSheet, outputSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    ["amount", "vat", "total"].forEach((key) => {
      const col = sheet.getColumn(key);
      if (col) {
        col.numFmt = "#,##0.00";
        col.alignment = { horizontal: "right" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportWHTReport(
  expenses: ExpenseData[],
  incomes: IncomeData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // WHT Summary
  const summarySheet = workbook.addWorksheet("สรุปหัก ณ ที่จ่าย");

  let whtPaid = 0;
  for (const e of expenses) {
    if (e.isWht) {
      whtPaid += Number(e.whtAmount) || 0;
    }
  }
  let whtReceived = 0;
  for (const i of incomes) {
    if (i.isWhtDeducted) {
      whtReceived += Number(i.whtAmount) || 0;
    }
  }

  summarySheet.columns = [
    { header: "รายการ", key: "item", width: 30 },
    { header: "จำนวนเงิน", key: "amount", width: 20 },
  ];

  summarySheet.addRow({ item: `รายงานภาษีหัก ณ ที่จ่าย ${period}`, amount: "" });
  summarySheet.addRow({ item: `บริษัท: ${companyName}`, amount: "" });
  summarySheet.addRow({ item: "", amount: "" });
  summarySheet.addRow({
    item: "หักจากผู้ขาย (ต้องนำส่ง)",
    amount: whtPaid,
  });
  summarySheet.addRow({
    item: "โดนหักจากลูกค้า (เครดิตภาษี)",
    amount: whtReceived,
  });
  summarySheet.addRow({ item: "", amount: "" });
  summarySheet.addRow({
    item: "สุทธิที่ต้องนำส่ง",
    amount: whtPaid - whtReceived,
  });

  summarySheet.getColumn("amount").numFmt = "#,##0.00";
  summarySheet.getColumn("amount").alignment = { horizontal: "right" };

  // WHT Paid Details
  const paidSheet = workbook.addWorksheet("หักจากผู้ขาย");
  paidSheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "ผู้ขาย", key: "vendor", width: 25 },
    { header: "เลขประจำตัวผู้เสียภาษี", key: "taxId", width: 18 },
    { header: "ยอด", key: "amount", width: 15 },
    { header: "อัตรา %", key: "rate", width: 10 },
    { header: "ภาษีหัก", key: "wht", width: 15 },
  ];

  expenses
    .filter((e) => e.isWht)
    .forEach((expense) => {
      paidSheet.addRow({
        date: expense.billDate.toLocaleDateString("th-TH"),
        vendor: expense.vendorName || "-",
        taxId: expense.vendorTaxId || "-",
        amount: Number(expense.amount),
        rate: Number(expense.whtRate) || 0,
        wht: Number(expense.whtAmount) || 0,
      });
    });

  // WHT Received Details
  const receivedSheet = workbook.addWorksheet("โดนหักจากลูกค้า");
  receivedSheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "ลูกค้า", key: "customer", width: 25 },
    { header: "ยอด", key: "amount", width: 15 },
    { header: "อัตรา %", key: "rate", width: 10 },
    { header: "ภาษีโดนหัก", key: "wht", width: 15 },
    { header: "ใบ 50 ทวิ", key: "cert", width: 12 },
  ];

  incomes
    .filter((i) => i.isWhtDeducted)
    .forEach((income) => {
      receivedSheet.addRow({
        date: income.receiveDate.toLocaleDateString("th-TH"),
        customer: income.customerName || "-",
        amount: Number(income.amount),
        rate: Number(income.whtRate) || 0,
        wht: Number(income.whtAmount) || 0,
        cert: "-", // Will be populated when file tracking is implemented
      });
    });

  // Style all sheets
  [paidSheet, receivedSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    ["amount", "wht"].forEach((key) => {
      const col = sheet.getColumn(key);
      if (col) {
        col.numFmt = "#,##0.00";
        col.alignment = { horizontal: "right" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
