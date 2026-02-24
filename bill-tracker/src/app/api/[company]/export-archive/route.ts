import { NextResponse } from "next/server";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import archiver from "archiver";
import {
  formatThaiDate,
  getThaiMonthName,
  generateFilename,
  getExpenseFolderPath,
  getIncomeFolderPath,
  getFileExtension,
  formatArchiveFilename,
  generateReadmeContent,
} from "@/lib/export/archive-utils";
import {
  exportExpensesToExcel,
  exportIncomesToExcel,
  exportMonthlyReport,
  exportVATReport,
  exportWHTReport,
} from "@/lib/export/excel";
import { OTHER_DOC_TYPE_LABELS, type OtherDocType } from "@/lib/constants/transaction";

interface ExpenseWithFiles {
  id: string;
  billDate: Date;
  contact: { name: string } | null;
  amount: any;
  vatRate: number;
  vatAmount: any;
  isWht: boolean;
  whtRate: any;
  whtAmount: any;
  netPaid: any;
  status: string;
  invoiceNumber: string | null;
  description: string | null;
  accountId: string | null;
  slipUrls: any;
  taxInvoiceUrls: any;
  whtCertUrls: any;
  otherDocUrls: any;
}

interface IncomeWithFiles {
  id: string;
  receiveDate: Date;
  contact: { name: string } | null;
  amount: any;
  vatRate: number;
  vatAmount: any;
  isWhtDeducted: boolean;
  whtRate: any;
  whtAmount: any;
  netReceived: any;
  status: string;
  invoiceNumber: string | null;
  source: string | null;
  customerSlipUrls: any;
  myBillCopyUrls: any;
  whtCertUrls: any;
  otherDocUrls: any;
}

export const GET = withCompanyAccessFromParams(async (req, { company }) => {
  try {
      const { searchParams } = new URL(req.url);

      // Get month and year from query params
      const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));
      const year = parseInt(searchParams.get("year") || String(new Date().getFullYear() + 543));

      // Convert Buddhist year to Gregorian
      const gregorianYear = year - 543;

      // Calculate date range
      const startDate = new Date(gregorianYear, month, 1);
      const endDate = new Date(gregorianYear, month + 1, 0, 23, 59, 59);

      // Fetch expenses with files
      const expensesRaw = await prisma.expense.findMany({
        where: {
          companyId: company.id,
          billDate: {
            gte: startDate,
            lte: endDate,
          },
          deletedAt: null,
        },
        include: {
          Contact: {
            select: { name: true },
          },
        },
        orderBy: { billDate: "asc" },
      });
      const expenses = expensesRaw.map((e) => ({ ...e, contact: e.Contact }));

      // Fetch incomes with files
      const incomesRaw = await prisma.income.findMany({
        where: {
          companyId: company.id,
          receiveDate: {
            gte: startDate,
            lte: endDate,
          },
          deletedAt: null,
        },
        include: {
          Contact: {
            select: { name: true },
          },
        },
        orderBy: { receiveDate: "asc" },
      });
      const incomes = incomesRaw.map((i) => ({ ...i, contact: i.Contact }));

      // Generate Excel reports
      const monthName = getThaiMonthName(month);
      const period = `${monthName} ${year}`;

      const expenseExcel = await exportExpensesToExcel(
        expenses.map((e) => ({
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
        })),
        company.name,
        period
      );

      const incomeExcel = await exportIncomesToExcel(
        incomes.map((i) => ({
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
        })),
        company.name,
        period
      );

      const monthlyReport = await exportMonthlyReport(
        expenses.map((e) => ({
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
        })),
        incomes.map((i) => ({
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
        })),
        company.name,
        period
      );

      const vatReport = await exportVATReport(
        expenses.map((e) => ({
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
        })),
        incomes.map((i) => ({
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
        })),
        company.name,
        period
      );

      const whtReport = await exportWHTReport(
        expenses.map((e) => ({
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
        })),
        incomes.map((i) => ({
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
        })),
        company.name,
        period
      );

      // Create ZIP archive
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      // Set response headers
      const filename = formatArchiveFilename(company.code, month, year);
      const headers = new Headers();
      headers.set("Content-Type", "application/zip");
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

      // Create a TransformStream to convert archive to web stream
      const { readable, writable } = new TransformStream();
      
      // Pipe archive to writable stream
      const writer = writable.getWriter();
      archive.on("data", (chunk) => {
        writer.write(chunk);
      });
      archive.on("end", () => {
        writer.close();
      });
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        writer.abort(err);
      });

      // Start building archive (non-blocking)
      (async () => {
        try {
          // Add README
          const readme = generateReadmeContent(company.name, period, {
            expenseCount: expenses.length,
            incomeCount: incomes.length,
            totalFiles: 0, // Will be calculated
          });
          archive.append(readme, { name: "README.txt" });

          // Add Excel reports
          archive.append(monthlyReport, { name: `รายงานสรุป/สรุปรายรับรายจ่าย-${monthName}${year}.xlsx` });
          archive.append(expenseExcel, { name: `รายงานสรุป/รายละเอียดรายจ่าย-${monthName}${year}.xlsx` });
          archive.append(incomeExcel, { name: `รายงานสรุป/รายละเอียดรายรับ-${monthName}${year}.xlsx` });
          archive.append(vatReport, { name: `รายงานสรุป/รายงาน-VAT-${monthName}${year}.xlsx` });
          archive.append(whtReport, { name: `รายงานสรุป/รายงาน-หัก ณ ที่จ่าย-${monthName}${year}.xlsx` });

          // Helper to download and add file to archive
          const addFileToArchive = async (url: string, folderPath: string, filename: string) => {
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
          };

          // Process expense files
          const fileNameCounter: Record<string, number> = {};
          
          for (const expense of expenses as ExpenseWithFiles[]) {
            const contactName = expense.contact?.name || "ไม่ระบุ";
            
            // Add slip files
            const slipUrls: string[] = Array.isArray(expense.slipUrls) 
              ? expense.slipUrls 
              : [];
            for (const url of slipUrls) {
              const ext = getFileExtension(url);
              const baseFilename = generateFilename(expense.billDate, contactName, "slip", ext);
              
              // Handle duplicates
              const key = `${getExpenseFolderPath("slip")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? generateFilename(expense.billDate, contactName, "slip", ext, fileNameCounter[key])
                : baseFilename;
              
              await addFileToArchive(url, getExpenseFolderPath("slip"), filename);
            }

            // Add invoice files
            const invoiceUrls: string[] = Array.isArray(expense.taxInvoiceUrls)
              ? expense.taxInvoiceUrls
              : [];
            for (const url of invoiceUrls) {
              const ext = getFileExtension(url);
              const baseFilename = generateFilename(expense.billDate, contactName, "invoice", ext);
              
              const key = `${getExpenseFolderPath("invoice")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? generateFilename(expense.billDate, contactName, "invoice", ext, fileNameCounter[key])
                : baseFilename;
              
              await addFileToArchive(url, getExpenseFolderPath("invoice"), filename);
            }

            // Add WHT cert files
            const whtUrls: string[] = Array.isArray(expense.whtCertUrls)
              ? expense.whtCertUrls
              : [];
            for (const url of whtUrls) {
              const ext = getFileExtension(url);
              const baseFilename = generateFilename(expense.billDate, contactName, "wht", ext);
              
              const key = `${getExpenseFolderPath("wht")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? generateFilename(expense.billDate, contactName, "wht", ext, fileNameCounter[key])
                : baseFilename;
              
              await addFileToArchive(url, getExpenseFolderPath("wht"), filename);
            }

            // Add other document files
            const otherDocs: any[] = Array.isArray(expense.otherDocUrls)
              ? expense.otherDocUrls
              : [];
            for (const doc of otherDocs) {
              // Handle both string[] and TypedOtherDoc[] formats
              const url = typeof doc === 'string' ? doc : doc.url;
              const docType = (typeof doc === 'object' && doc.type) ? doc.type as OtherDocType : 'OTHER';
              if (!url) continue;
              
              // Get Thai label for the document type
              const typeLabel = OTHER_DOC_TYPE_LABELS[docType] || "อื่นๆ";
              const ext = getFileExtension(url);
              const dateStr = formatThaiDate(expense.billDate);
              const safeName = contactName.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-");
              const baseFilename = `${dateStr}-${safeName}-${typeLabel}.${ext}`;
              
              const key = `${getExpenseFolderPath("other")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? `${dateStr}-${safeName}-${typeLabel}-${fileNameCounter[key]}.${ext}`
                : baseFilename;
              
              await addFileToArchive(url, getExpenseFolderPath("other"), filename);
            }
          }

          // Process income files
          for (const income of incomes as IncomeWithFiles[]) {
            const contactName = income.contact?.name || "ไม่ระบุ";

            // Add customer slip files
            const slipUrls: string[] = Array.isArray(income.customerSlipUrls)
              ? income.customerSlipUrls
              : [];
            for (const url of slipUrls) {
              const ext = getFileExtension(url);
              const baseFilename = generateFilename(income.receiveDate, contactName, "slip", ext);
              
              const key = `${getIncomeFolderPath("slip")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? generateFilename(income.receiveDate, contactName, "slip", ext, fileNameCounter[key])
                : baseFilename;
              
              await addFileToArchive(url, getIncomeFolderPath("slip"), filename);
            }

            // Add bill copy files
            const billUrls: string[] = Array.isArray(income.myBillCopyUrls)
              ? income.myBillCopyUrls
              : [];
            for (const url of billUrls) {
              const ext = getFileExtension(url);
              const baseFilename = generateFilename(income.receiveDate, contactName, "bill", ext);
              
              const key = `${getIncomeFolderPath("bill")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? generateFilename(income.receiveDate, contactName, "bill", ext, fileNameCounter[key])
                : baseFilename;
              
              await addFileToArchive(url, getIncomeFolderPath("bill"), filename);
            }

            // Add WHT cert files
            const whtUrls: string[] = Array.isArray(income.whtCertUrls)
              ? income.whtCertUrls
              : [];
            for (const url of whtUrls) {
              const ext = getFileExtension(url);
              const baseFilename = generateFilename(income.receiveDate, contactName, "wht", ext);
              
              const key = `${getIncomeFolderPath("wht")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? generateFilename(income.receiveDate, contactName, "wht", ext, fileNameCounter[key])
                : baseFilename;
              
              await addFileToArchive(url, getIncomeFolderPath("wht"), filename);
            }

            // Add other document files
            const otherDocs: any[] = Array.isArray(income.otherDocUrls)
              ? income.otherDocUrls
              : [];
            for (const doc of otherDocs) {
              // Handle both string[] and TypedOtherDoc[] formats
              const url = typeof doc === 'string' ? doc : doc.url;
              const docType = (typeof doc === 'object' && doc.type) ? doc.type as OtherDocType : 'OTHER';
              if (!url) continue;
              
              // Get Thai label for the document type
              const typeLabel = OTHER_DOC_TYPE_LABELS[docType] || "อื่นๆ";
              const ext = getFileExtension(url);
              const dateStr = formatThaiDate(income.receiveDate);
              const safeName = contactName.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-");
              const baseFilename = `${dateStr}-${safeName}-${typeLabel}.${ext}`;
              
              const key = `${getIncomeFolderPath("other")}/${baseFilename}`;
              fileNameCounter[key] = (fileNameCounter[key] || 0) + 1;
              const filename = fileNameCounter[key] > 1
                ? `${dateStr}-${safeName}-${typeLabel}-${fileNameCounter[key]}.${ext}`
                : baseFilename;
              
              await addFileToArchive(url, getIncomeFolderPath("other"), filename);
            }
          }

          // Finalize archive
          await archive.finalize();
        } catch (error) {
          console.error("Error building archive:", error);
          archive.abort();
        }
      })();

      // Return streaming response
      return new NextResponse(readable, { headers });
  } catch (error) {
    console.error("Export archive error:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
  }
});
