import archiver from "archiver";
import { Readable } from "stream";
import {
  exportExpensesToExcel,
  exportIncomesToExcel,
  exportVATReport,
  exportWHTReport,
} from "./excel";

// ============================================================================
// Types
// ============================================================================

interface ExpenseWithFiles {
  id: string;
  billDate: Date;
  contact?: { name: string; taxId?: string | null } | null;
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
  slipUrls: string[];
  taxInvoiceUrls: string[];
  whtCertUrls: string[];
}

interface IncomeWithFiles {
  id: string;
  receiveDate: Date;
  contact?: { name: string; taxId?: string | null } | null;
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
  customerSlipUrls: string[];
  myBillCopyUrls: string[];
  whtCertUrls: string[];
}

export interface ArchiveOptions {
  companyCode: string;
  companyName: string;
  month: number;
  year: number;
  expenses: ExpenseWithFiles[];
  incomes: IncomeWithFiles[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize filename/folder name for safe filesystem use
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, "") // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
}

/**
 * Format amount for folder name
 */
function formatAmount(amount: number): string {
  return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format date for folder name (YYYY-MM-DD)
 */
function formatDateForFolder(date: Date): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Get Thai month name
 */
function getThaiMonth(month: number): string {
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  return months[month - 1] || "";
}

/**
 * Get file extension from URL
 */
function getExtension(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : "file";
}

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download ${url}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return null;
  }
}

// ============================================================================
// Archive Generation
// ============================================================================

/**
 * Generate accounting archive ZIP
 */
export async function generateAccountingArchive(
  options: ArchiveOptions
): Promise<Buffer> {
  const { companyCode, companyName, month, year, expenses, incomes } = options;

  const monthStr = String(month).padStart(2, "0");
  const baseFolder = `${companyCode}_${year}-${monthStr}`;
  const period = `${monthStr}/${year}`;

  // Create archive
  const archive = archiver("zip", {
    zlib: { level: 6 },
  });

  const chunks: Buffer[] = [];
  archive.on("data", (chunk) => chunks.push(chunk));

  // Track download promises for parallel processing
  const downloadPromises: Promise<void>[] = [];

  // ========== Expenses Folder ==========
  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const idx = String(i + 1).padStart(3, "0");
    const contactName = expense.contact?.name || "ไม่ระบุผู้ขาย";
    const dateStr = formatDateForFolder(expense.billDate);
    const amountStr = formatAmount(Number(expense.netPaid));

    const folderName = sanitizeName(
      `${idx}_${dateStr}_${contactName}_${amountStr}`
    );
    const expenseFolder = `${baseFolder}/รายจ่าย/${folderName}`;

    // Add invoice files
    expense.taxInvoiceUrls.forEach((url, fileIdx) => {
      const ext = getExtension(url);
      const fileName = `ใบกำกับภาษี_${String(fileIdx + 1).padStart(2, "0")}.${ext}`;
      downloadPromises.push(
        downloadFile(url).then((buffer) => {
          if (buffer) {
            archive.append(buffer, { name: `${expenseFolder}/${fileName}` });
          }
        })
      );
    });

    // Add slip files
    expense.slipUrls.forEach((url, fileIdx) => {
      const ext = getExtension(url);
      const fileName = `สลิปโอน_${String(fileIdx + 1).padStart(2, "0")}.${ext}`;
      downloadPromises.push(
        downloadFile(url).then((buffer) => {
          if (buffer) {
            archive.append(buffer, { name: `${expenseFolder}/${fileName}` });
          }
        })
      );
    });

    // Add WHT cert files
    expense.whtCertUrls.forEach((url, fileIdx) => {
      const ext = getExtension(url);
      const fileName = `หนังสือหักภาษี_${String(fileIdx + 1).padStart(2, "0")}.${ext}`;
      downloadPromises.push(
        downloadFile(url).then((buffer) => {
          if (buffer) {
            archive.append(buffer, { name: `${expenseFolder}/${fileName}` });
          }
        })
      );
    });
  }

  // ========== Incomes Folder ==========
  for (let i = 0; i < incomes.length; i++) {
    const income = incomes[i];
    const idx = String(i + 1).padStart(3, "0");
    const contactName = income.contact?.name || "ไม่ระบุลูกค้า";
    const dateStr = formatDateForFolder(income.receiveDate);
    const amountStr = formatAmount(Number(income.netReceived));

    const folderName = sanitizeName(
      `${idx}_${dateStr}_${contactName}_${amountStr}`
    );
    const incomeFolder = `${baseFolder}/รายรับ/${folderName}`;

    // Add bill copy files
    income.myBillCopyUrls.forEach((url, fileIdx) => {
      const ext = getExtension(url);
      const fileName = `สำเนาบิล_${String(fileIdx + 1).padStart(2, "0")}.${ext}`;
      downloadPromises.push(
        downloadFile(url).then((buffer) => {
          if (buffer) {
            archive.append(buffer, { name: `${incomeFolder}/${fileName}` });
          }
        })
      );
    });

    // Add customer slip files
    income.customerSlipUrls.forEach((url, fileIdx) => {
      const ext = getExtension(url);
      const fileName = `สลิปลูกค้า_${String(fileIdx + 1).padStart(2, "0")}.${ext}`;
      downloadPromises.push(
        downloadFile(url).then((buffer) => {
          if (buffer) {
            archive.append(buffer, { name: `${incomeFolder}/${fileName}` });
          }
        })
      );
    });

    // Add WHT cert files (50 ทวิ)
    income.whtCertUrls.forEach((url, fileIdx) => {
      const ext = getExtension(url);
      const fileName = `ใบ50ทวิ_${String(fileIdx + 1).padStart(2, "0")}.${ext}`;
      downloadPromises.push(
        downloadFile(url).then((buffer) => {
          if (buffer) {
            archive.append(buffer, { name: `${incomeFolder}/${fileName}` });
          }
        })
      );
    });
  }

  // Wait for all downloads to complete
  await Promise.all(downloadPromises);

  // ========== Reports Folder ==========
  const reportsFolder = `${baseFolder}/รายงาน`;

  // Transform data for Excel export
  const expenseData = expenses.map((e) => ({
    billDate: e.billDate,
    vendorName: e.contact?.name || null,
    vendorTaxId: e.contact?.taxId || null,
    description: e.description,
    category: e.category,
    amount: Number(e.amount),
    vatRate: e.vatRate,
    vatAmount: e.vatAmount ? Number(e.vatAmount) : null,
    isWht: e.isWht,
    whtRate: e.whtRate ? Number(e.whtRate) : null,
    whtAmount: e.whtAmount ? Number(e.whtAmount) : null,
    netPaid: Number(e.netPaid),
    status: e.status,
    invoiceNumber: e.invoiceNumber,
  }));

  const incomeData = incomes.map((i) => ({
    receiveDate: i.receiveDate,
    customerName: i.contact?.name || null,
    customerTaxId: i.contact?.taxId || null,
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
  }));

  // Generate and add Excel reports
  const expenseExcel = await exportExpensesToExcel(
    expenseData,
    companyName,
    period
  );
  archive.append(expenseExcel, {
    name: `${reportsFolder}/สรุปรายจ่าย_${companyCode}_${monthStr}-${year}.xlsx`,
  });

  const incomeExcel = await exportIncomesToExcel(
    incomeData,
    companyName,
    period
  );
  archive.append(incomeExcel, {
    name: `${reportsFolder}/สรุปรายรับ_${companyCode}_${monthStr}-${year}.xlsx`,
  });

  const vatReport = await exportVATReport(
    expenseData,
    incomeData,
    companyName,
    period
  );
  archive.append(vatReport, {
    name: `${reportsFolder}/รายงาน_VAT_${companyCode}_${monthStr}-${year}.xlsx`,
  });

  const whtReport = await exportWHTReport(
    expenseData,
    incomeData,
    companyName,
    period
  );
  archive.append(whtReport, {
    name: `${reportsFolder}/รายงาน_WHT_${companyCode}_${monthStr}-${year}.xlsx`,
  });

  // Finalize archive
  await archive.finalize();

  return Buffer.concat(chunks);
}

/**
 * Get archive statistics for preview
 */
export function getArchiveStats(
  expenses: ExpenseWithFiles[],
  incomes: IncomeWithFiles[]
): {
  expenseCount: number;
  incomeCount: number;
  totalExpenseFiles: number;
  totalIncomeFiles: number;
  totalExpenseAmount: number;
  totalIncomeAmount: number;
} {
  let totalExpenseFiles = 0;
  let totalIncomeFiles = 0;
  let totalExpenseAmount = 0;
  let totalIncomeAmount = 0;

  for (const expense of expenses) {
    totalExpenseFiles +=
      expense.slipUrls.length +
      expense.taxInvoiceUrls.length +
      expense.whtCertUrls.length;
    totalExpenseAmount += Number(expense.netPaid);
  }

  for (const income of incomes) {
    totalIncomeFiles +=
      income.customerSlipUrls.length +
      income.myBillCopyUrls.length +
      income.whtCertUrls.length;
    totalIncomeAmount += Number(income.netReceived);
  }

  return {
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    totalExpenseFiles,
    totalIncomeFiles,
    totalExpenseAmount,
    totalIncomeAmount,
  };
}
