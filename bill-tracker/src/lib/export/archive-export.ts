import archiver from "archiver";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getThaiMonthRange } from "@/lib/queries/date-utils";
import { buildExpenseBaseWhere, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import {
  formatThaiDate,
  getThaiMonthName,
  generateFilename,
  getExpenseFolderPath,
  getIncomeFolderPath,
  getFileExtension,
  formatArchiveFilename,
  generateReadmeContent,
} from "./archive-utils";
import {
  exportExpensesToExcel,
  exportIncomesToExcel,
  exportMonthlyReport,
  exportVATReport,
  exportWHTReport,
} from "./excel";
import {
  OTHER_DOC_TYPE_LABELS,
  type OtherDocType,
} from "@/lib/constants/transaction";

// ============================================================================
// Types
// ============================================================================

interface ExpenseWithFiles {
  id: string;
  billDate: Date;
  contact: { name: string } | null;
  amount: Prisma.Decimal;
  vatRate: number;
  vatAmount: Prisma.Decimal | null;
  isWht: boolean;
  whtRate: Prisma.Decimal | null;
  whtAmount: Prisma.Decimal | null;
  netPaid: Prisma.Decimal;
  status: string;
  invoiceNumber: string | null;
  description: string | null;
  accountId: string | null;
  slipUrls: Prisma.JsonValue;
  taxInvoiceUrls: Prisma.JsonValue;
  whtCertUrls: Prisma.JsonValue;
  otherDocUrls: Prisma.JsonValue;
}

interface IncomeWithFiles {
  id: string;
  receiveDate: Date;
  contact: { name: string } | null;
  amount: Prisma.Decimal;
  vatRate: number;
  vatAmount: Prisma.Decimal | null;
  isWhtDeducted: boolean;
  whtRate: Prisma.Decimal | null;
  whtAmount: Prisma.Decimal | null;
  netReceived: Prisma.Decimal;
  status: string;
  invoiceNumber: string | null;
  source: string | null;
  customerSlipUrls: Prisma.JsonValue;
  myBillCopyUrls: Prisma.JsonValue;
  whtCertUrls: Prisma.JsonValue;
  otherDocUrls: Prisma.JsonValue;
}

export interface ExportArchiveParams {
  companyId: string;
  companyCode: string;
  companyName: string;
  month: number;
  year: number;
}

export interface ExportArchiveResult {
  readable: ReadableStream;
  filename: string;
}

// ============================================================================
// Date Range
// ============================================================================

function computeDateRange(month: number, buddhistYear: number) {
  const gregorianYear = buddhistYear - 543;
  // month is 0-based coming from JS Date.getMonth(); convert to 1-based for getThaiMonthRange
  return getThaiMonthRange(gregorianYear, month + 1);
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchExpenses(companyId: string, startDate: Date, endDate: Date) {
  const raw = await prisma.expense.findMany({
    where: {
      ...buildExpenseBaseWhere(companyId),
      billDate: { gte: startDate, lte: endDate },
    },
    include: { Contact: { select: { name: true } } },
    orderBy: { billDate: "asc" },
  });
  return raw.map((e) => ({ ...e, contact: e.Contact }));
}

async function fetchIncomes(companyId: string, startDate: Date, endDate: Date) {
  const raw = await prisma.income.findMany({
    where: {
      ...buildIncomeBaseWhere(companyId),
      receiveDate: { gte: startDate, lte: endDate },
    },
    include: { Contact: { select: { name: true } } },
    orderBy: { receiveDate: "asc" },
  });
  return raw.map((i) => ({ ...i, contact: i.Contact }));
}

// ============================================================================
// Data Mapping (eliminates 5x duplication in the original route)
// ============================================================================

function mapExpenseToExcelRow(e: ExpenseWithFiles) {
  return {
    billDate: e.billDate,
    vendorName: e.contact?.name,
    vendorTaxId: null,
    description: e.description,
    accountId: e.accountId,
    amount: Number(e.amount),
    vatRate: e.vatRate,
    vatAmount: e.vatAmount ? Number(e.vatAmount) : null,
    isWht: e.isWht,
    whtRate: e.whtRate ? Number(e.whtRate) : null,
    whtAmount: e.whtAmount ? Number(e.whtAmount) : null,
    netPaid: Number(e.netPaid),
    status: e.status,
    invoiceNumber: e.invoiceNumber,
  };
}

function mapIncomeToExcelRow(i: IncomeWithFiles) {
  return {
    receiveDate: i.receiveDate,
    customerName: i.contact?.name,
    customerTaxId: null,
    source: i.source,
    amount: Number(i.amount),
    vatRate: i.vatRate,
    vatAmount: i.vatAmount ? Number(i.vatAmount) : null,
    isWhtDeducted: i.isWhtDeducted,
    whtRate: i.whtRate ? Number(i.whtRate) : null,
    whtAmount: i.whtAmount ? Number(i.whtAmount) : null,
    netReceived: Number(i.netReceived),
    status: i.status,
    invoiceNumber: i.invoiceNumber,
  };
}

// ============================================================================
// Excel Reports
// ============================================================================

async function generateExcelReports(
  expenses: ExpenseWithFiles[],
  incomes: IncomeWithFiles[],
  companyName: string,
  period: string
) {
  const expenseRows = expenses.map(mapExpenseToExcelRow);
  const incomeRows = incomes.map(mapIncomeToExcelRow);

  const [expenseExcel, incomeExcel, monthlyReport, vatReport, whtReport] =
    await Promise.all([
      exportExpensesToExcel(expenseRows, companyName, period),
      exportIncomesToExcel(incomeRows, companyName, period),
      exportMonthlyReport(expenseRows, incomeRows, companyName, period),
      exportVATReport(expenseRows, incomeRows, companyName, period),
      exportWHTReport(expenseRows, incomeRows, companyName, period),
    ]);

  return { expenseExcel, incomeExcel, monthlyReport, vatReport, whtReport };
}

// ============================================================================
// File Download Helper
// ============================================================================

async function downloadAndAppend(
  archive: archiver.Archiver,
  url: string,
  folderPath: string,
  filename: string
) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to download: ${url}`);
      return;
    }
    const buffer = await response.arrayBuffer();
    archive.append(Buffer.from(buffer), { name: `${folderPath}/${filename}` });
  } catch (error) {
    console.error(`Error downloading file ${url}:`, error);
  }
}

// ============================================================================
// File Processing
// ============================================================================

function resolveUniqueFilename(
  counter: Record<string, number>,
  folderPath: string,
  baseFilename: string,
  makeFilename: (index: number) => string
): string {
  const key = `${folderPath}/${baseFilename}`;
  counter[key] = (counter[key] || 0) + 1;
  return counter[key] > 1 ? makeFilename(counter[key]) : baseFilename;
}

function safeUrls(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

async function processExpenseFiles(
  archive: archiver.Archiver,
  expenses: ExpenseWithFiles[],
  counter: Record<string, number>
) {
  for (const expense of expenses) {
    const contactName = expense.contact?.name || "ไม่ระบุ";

    for (const url of safeUrls(expense.slipUrls)) {
      const ext = getFileExtension(url);
      const base = generateFilename(expense.billDate, contactName, "slip", ext);
      const folder = getExpenseFolderPath("slip");
      const name = resolveUniqueFilename(counter, folder, base, (i) =>
        generateFilename(expense.billDate, contactName, "slip", ext, i)
      );
      await downloadAndAppend(archive, url, folder, name);
    }

    for (const url of safeUrls(expense.taxInvoiceUrls)) {
      const ext = getFileExtension(url);
      const base = generateFilename(expense.billDate, contactName, "invoice", ext);
      const folder = getExpenseFolderPath("invoice");
      const name = resolveUniqueFilename(counter, folder, base, (i) =>
        generateFilename(expense.billDate, contactName, "invoice", ext, i)
      );
      await downloadAndAppend(archive, url, folder, name);
    }

    for (const url of safeUrls(expense.whtCertUrls)) {
      const ext = getFileExtension(url);
      const base = generateFilename(expense.billDate, contactName, "wht", ext);
      const folder = getExpenseFolderPath("wht");
      const name = resolveUniqueFilename(counter, folder, base, (i) =>
        generateFilename(expense.billDate, contactName, "wht", ext, i)
      );
      await downloadAndAppend(archive, url, folder, name);
    }

    await processOtherDocs(
      archive, counter, expense.otherDocUrls, expense.billDate,
      contactName, getExpenseFolderPath("other")
    );
  }
}

async function processIncomeFiles(
  archive: archiver.Archiver,
  incomes: IncomeWithFiles[],
  counter: Record<string, number>
) {
  for (const income of incomes) {
    const contactName = income.contact?.name || "ไม่ระบุ";

    for (const url of safeUrls(income.customerSlipUrls)) {
      const ext = getFileExtension(url);
      const base = generateFilename(income.receiveDate, contactName, "slip", ext);
      const folder = getIncomeFolderPath("slip");
      const name = resolveUniqueFilename(counter, folder, base, (i) =>
        generateFilename(income.receiveDate, contactName, "slip", ext, i)
      );
      await downloadAndAppend(archive, url, folder, name);
    }

    for (const url of safeUrls(income.myBillCopyUrls)) {
      const ext = getFileExtension(url);
      const base = generateFilename(income.receiveDate, contactName, "bill", ext);
      const folder = getIncomeFolderPath("bill");
      const name = resolveUniqueFilename(counter, folder, base, (i) =>
        generateFilename(income.receiveDate, contactName, "bill", ext, i)
      );
      await downloadAndAppend(archive, url, folder, name);
    }

    for (const url of safeUrls(income.whtCertUrls)) {
      const ext = getFileExtension(url);
      const base = generateFilename(income.receiveDate, contactName, "wht", ext);
      const folder = getIncomeFolderPath("wht");
      const name = resolveUniqueFilename(counter, folder, base, (i) =>
        generateFilename(income.receiveDate, contactName, "wht", ext, i)
      );
      await downloadAndAppend(archive, url, folder, name);
    }

    await processOtherDocs(
      archive, counter, income.otherDocUrls, income.receiveDate,
      contactName, getIncomeFolderPath("other")
    );
  }
}

interface OtherDocEntry {
  url?: string;
  type?: string;
}

async function processOtherDocs(
  archive: archiver.Archiver,
  counter: Record<string, number>,
  otherDocUrls: Prisma.JsonValue,
  date: Date,
  contactName: string,
  folder: string
) {
  const docs = (Array.isArray(otherDocUrls) ? otherDocUrls : []) as (string | OtherDocEntry)[];
  for (const doc of docs) {
    const url = typeof doc === "string" ? doc : doc.url;
    const docType = (typeof doc === "object" && doc !== null && doc.type)
      ? (doc.type as OtherDocType)
      : "OTHER";
    if (!url) continue;

    const typeLabel = OTHER_DOC_TYPE_LABELS[docType] || "อื่นๆ";
    const ext = getFileExtension(url);
    const dateStr = formatThaiDate(date);
    const safeName = contactName.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-");
    const base = `${dateStr}-${safeName}-${typeLabel}.${ext}`;
    const name = resolveUniqueFilename(counter, folder, base, (i) =>
      `${dateStr}-${safeName}-${typeLabel}-${i}.${ext}`
    );
    await downloadAndAppend(archive, url, folder, name);
  }
}

// ============================================================================
// Main Export
// ============================================================================

export async function buildExportArchive(
  params: ExportArchiveParams
): Promise<ExportArchiveResult> {
  const { companyId, companyCode, companyName, month, year } = params;
  const { startDate, endDate } = computeDateRange(month, year);

  const [expenses, incomes] = await Promise.all([
    fetchExpenses(companyId, startDate, endDate),
    fetchIncomes(companyId, startDate, endDate),
  ]);

  const monthName = getThaiMonthName(month);
  const period = `${monthName} ${year}`;

  const reports = await generateExcelReports(
    expenses as ExpenseWithFiles[],
    incomes as IncomeWithFiles[],
    companyName,
    period
  );

  const archive = archiver("zip", { zlib: { level: 9 } });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  archive.on("data", (chunk) => writer.write(chunk));
  archive.on("end", () => writer.close());
  archive.on("error", (err) => {
    console.error("Archive error:", err);
    writer.abort(err);
  });

  (async () => {
    try {
      archive.append(
        generateReadmeContent(companyName, period, {
          expenseCount: expenses.length,
          incomeCount: incomes.length,
          totalFiles: 0,
        }),
        { name: "README.txt" }
      );

      archive.append(reports.monthlyReport, {
        name: `รายงานสรุป/สรุปรายรับรายจ่าย-${monthName}${year}.xlsx`,
      });
      archive.append(reports.expenseExcel, {
        name: `รายงานสรุป/รายละเอียดรายจ่าย-${monthName}${year}.xlsx`,
      });
      archive.append(reports.incomeExcel, {
        name: `รายงานสรุป/รายละเอียดรายรับ-${monthName}${year}.xlsx`,
      });
      archive.append(reports.vatReport, {
        name: `รายงานสรุป/รายงาน-VAT-${monthName}${year}.xlsx`,
      });
      archive.append(reports.whtReport, {
        name: `รายงานสรุป/รายงาน-หัก ณ ที่จ่าย-${monthName}${year}.xlsx`,
      });

      const fileNameCounter: Record<string, number> = {};
      await processExpenseFiles(archive, expenses as ExpenseWithFiles[], fileNameCounter);
      await processIncomeFiles(archive, incomes as IncomeWithFiles[], fileNameCounter);

      await archive.finalize();
    } catch (error) {
      console.error("Error building archive:", error);
      archive.abort();
    }
  })();

  const filename = formatArchiveFilename(companyCode, month, year);
  return { readable, filename };
}
