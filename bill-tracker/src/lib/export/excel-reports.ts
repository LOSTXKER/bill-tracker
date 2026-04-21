import ExcelJS from "exceljs";
import {
  ExpenseData,
  IncomeData,
  CATEGORY_LABELS,
  styleHeaderRow,
  styleNumericColumns,
} from "./excel-types";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";

export async function exportMonthlyReport(
  expenses: ExpenseData[],
  incomes: IncomeData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

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

  summarySheet.addRow({ item: `รายงานประจำเดือน ${period}`, amount: "" });
  summarySheet.addRow({ item: `บริษัท: ${companyName}`, amount: "" });
  summarySheet.addRow({ item: "", amount: "" });
  summarySheet.addRow({ item: "รายรับรวม", amount: totalIncome });
  summarySheet.addRow({ item: "รายจ่ายรวม", amount: totalExpense });
  summarySheet.addRow({ item: "กระแสเงินสดสุทธิ", amount: netCashFlow });

  summarySheet.getColumn("amount").numFmt = "#,##0.00";
  summarySheet.getColumn("amount").alignment = { horizontal: "right" };

  const expenseSheet = workbook.addWorksheet("รายจ่าย");
  expenseSheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
    { header: "วันที่", key: "date", width: 12 },
    { header: "ผู้ขาย", key: "vendor", width: 25 },
    { header: "รายละเอียด", key: "description", width: 30 },
    { header: "หมวดหมู่", key: "category", width: 20 },
    { header: "บริษัทที่จ่าย", key: "payer", width: 18 },
    { header: "ยอดก่อน VAT", key: "amount", width: 15 },
    { header: "VAT", key: "vat", width: 15 },
    { header: "WHT", key: "wht", width: 15 },
    { header: "ยอดจ่ายจริง", key: "netPaid", width: 15 },
  ];

  expenses.forEach((expense) => {
    expenseSheet.addRow({
      documentCode: expense.documentCode || "-",
      date: expense.billDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
      vendor: expense.vendorName || "-",
      description: expense.description || "-",
      category: expense.category ? CATEGORY_LABELS[expense.category] || expense.category : "-",
      payer: expense.payerCompanyName ? `${expense.payerCompanyName} (จ่ายแทน)` : "จ่ายเอง",
      amount: Number(expense.amount),
      vat: Number(expense.vatAmount) || 0,
      wht: expense.isWht ? Number(expense.whtAmount) || 0 : 0,
      netPaid: Number(expense.netPaid),
    });
  });

  const incomeSheet = workbook.addWorksheet("รายรับ");
  incomeSheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
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
      documentCode: income.documentCode || "-",
      date: income.receiveDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
      customer: income.customerName || "-",
      source: income.source || "-",
      amount: Number(income.amount),
      vat: Number(income.vatAmount) || 0,
      wht: income.isWhtDeducted ? Number(income.whtAmount) || 0 : 0,
      netReceived: Number(income.netReceived),
    });
  });

  [expenseSheet, incomeSheet].forEach((sheet) => {
    styleHeaderRow(sheet);
    styleNumericColumns(sheet, ["amount", "vat", "wht", "netPaid", "netReceived"]);
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

  const inputSheet = workbook.addWorksheet("ภาษีซื้อ");
  inputSheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
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
      documentCode: expense.documentCode || "-",
      date: expense.billDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
      invoiceNo: expense.invoiceNumber || "-",
      vendor: expense.vendorName || "-",
      taxId: expense.vendorTaxId || "-",
      amount: Number(expense.amount),
      vat: Number(expense.vatAmount) || 0,
      total: Number(expense.amount) + (Number(expense.vatAmount) || 0),
    });
  });

  const outputSheet = workbook.addWorksheet("ภาษีขาย");
  outputSheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
    { header: "วันที่", key: "date", width: 12 },
    { header: "เลขที่ใบกำกับ", key: "invoiceNo", width: 15 },
    { header: "ลูกค้า", key: "customer", width: 25 },
    { header: "มูลค่าสินค้า", key: "amount", width: 15 },
    { header: "VAT 7%", key: "vat", width: 15 },
    { header: "รวม", key: "total", width: 15 },
  ];

  incomes.forEach((income) => {
    outputSheet.addRow({
      documentCode: income.documentCode || "-",
      date: income.receiveDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
      invoiceNo: income.invoiceNumber || "-",
      customer: income.customerName || "-",
      amount: Number(income.amount),
      vat: Number(income.vatAmount) || 0,
      total: Number(income.amount) + (Number(income.vatAmount) || 0),
    });
  });

  [inputSheet, outputSheet].forEach((sheet) => {
    styleHeaderRow(sheet);
    styleNumericColumns(sheet, ["amount", "vat", "total"]);
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
  summarySheet.addRow({ item: "หักจากผู้ขาย (ต้องนำส่ง)", amount: whtPaid });
  summarySheet.addRow({ item: "โดนหักจากลูกค้า (เครดิตภาษี)", amount: whtReceived });
  summarySheet.addRow({ item: "", amount: "" });
  summarySheet.addRow({ item: "สุทธิที่ต้องนำส่ง", amount: whtPaid - whtReceived });

  summarySheet.getColumn("amount").numFmt = "#,##0.00";
  summarySheet.getColumn("amount").alignment = { horizontal: "right" };

  const paidSheet = workbook.addWorksheet("หักจากผู้ขาย");
  paidSheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
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
        documentCode: expense.documentCode || "-",
        date: expense.billDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
        vendor: expense.vendorName || "-",
        taxId: expense.vendorTaxId || "-",
        amount: Number(expense.amount),
        rate: Number(expense.whtRate) || 0,
        wht: Number(expense.whtAmount) || 0,
      });
    });

  const receivedSheet = workbook.addWorksheet("โดนหักจากลูกค้า");
  receivedSheet.columns = [
    { header: "เลขที่เอกสาร", key: "documentCode", width: 18 },
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
        documentCode: income.documentCode || "-",
        date: income.receiveDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE }),
        customer: income.customerName || "-",
        amount: Number(income.amount),
        rate: Number(income.whtRate) || 0,
        wht: Number(income.whtAmount) || 0,
        cert: "-",
      });
    });

  [paidSheet, receivedSheet].forEach((sheet) => {
    styleHeaderRow(sheet);
    styleNumericColumns(sheet, ["amount", "wht"]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
