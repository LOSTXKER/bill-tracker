import ExcelJS from "exceljs";
import {
  ExpenseData,
  IncomeData,
  CATEGORY_LABELS,
  STATUS_LABELS,
  styleHeaderRow,
  styleNumericColumns,
} from "./excel-types";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";

export async function exportExpensesToExcel(
  expenses: ExpenseData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("รายจ่าย");

  worksheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
    { header: "วันที่", key: "date", width: 12 },
    { header: "เลขที่ใบกำกับ", key: "invoiceNo", width: 15 },
    { header: "ผู้ขาย", key: "vendor", width: 25 },
    { header: "เลขภาษีผู้ขาย", key: "taxId", width: 15 },
    { header: "รายละเอียด", key: "description", width: 30 },
    { header: "หมวดหมู่", key: "category", width: 20 },
    { header: "บริษัทที่จ่าย", key: "payer", width: 18 },
    { header: "ยอดก่อน VAT", key: "amount", width: 15 },
    { header: "VAT %", key: "vatRate", width: 10 },
    { header: "VAT", key: "vat", width: 15 },
    { header: "WHT %", key: "whtRate", width: 10 },
    { header: "WHT", key: "wht", width: 15 },
    { header: "ยอดจ่ายจริง", key: "netPaid", width: 15 },
    { header: "สถานะ", key: "status", width: 15 },
  ];

  styleHeaderRow(worksheet);

  expenses.forEach((expense) => {
    worksheet.addRow({
      documentCode: expense.documentCode || "-",
      date: expense.billDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
      invoiceNo: expense.invoiceNumber || "-",
      vendor: expense.vendorName || "-",
      taxId: expense.vendorTaxId || "-",
      description: expense.description || "-",
      category: expense.category ? CATEGORY_LABELS[expense.category] || expense.category : "-",
      payer: expense.payerCompanyName ? `${expense.payerCompanyName} (จ่ายแทน)` : "จ่ายเอง",
      amount: Number(expense.amount),
      vatRate: expense.vatRate,
      vat: Number(expense.vatAmount) || 0,
      whtRate: expense.isWht ? Number(expense.whtRate) || 0 : 0,
      wht: expense.isWht ? Number(expense.whtAmount) || 0 : 0,
      netPaid: Number(expense.netPaid),
      status: STATUS_LABELS[expense.status] || expense.status,
    });
  });

  styleNumericColumns(worksheet, ["amount", "vat", "wht", "netPaid"]);

  const lastRow = worksheet.lastRow?.number || 1;
  const totalRow = worksheet.addRow({
    documentCode: "",
    date: "",
    invoiceNo: "",
    vendor: "",
    taxId: "",
    description: "",
    category: "รวมทั้งหมด",
    payer: "",
    amount: { formula: `SUM(I2:I${lastRow})` },
    vatRate: "",
    vat: { formula: `SUM(K2:K${lastRow})` },
    whtRate: "",
    wht: { formula: `SUM(M2:M${lastRow})` },
    netPaid: { formula: `SUM(N2:N${lastRow})` },
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

  worksheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
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

  styleHeaderRow(worksheet);

  incomes.forEach((income) => {
    worksheet.addRow({
      documentCode: income.documentCode || "-",
      date: income.receiveDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
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

  styleNumericColumns(worksheet, ["amount", "vat", "wht", "netReceived"]);

  const lastRow = worksheet.lastRow?.number || 1;
  const totalRow = worksheet.addRow({
    documentCode: "",
    date: "",
    invoiceNo: "",
    customer: "",
    taxId: "",
    source: "รวมทั้งหมด",
    amount: { formula: `SUM(G2:G${lastRow})` },
    vatRate: "",
    vat: { formula: `SUM(I2:I${lastRow})` },
    whtRate: "",
    wht: { formula: `SUM(K2:K${lastRow})` },
    netReceived: { formula: `SUM(L2:L${lastRow})` },
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
