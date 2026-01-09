import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import {
  generateAccountingArchive,
  getArchiveStats,
} from "@/lib/export/archive";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // URL: /api/[company]/archive → pathParts = ["", "api", "company", "archive"]
  return pathParts[2];
};

// Helper to parse JSON array from Prisma (can be string or array)
function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((v) => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

// GET /api/[company]/archive?month=1&year=2026&preview=true
// Returns archive stats for preview
async function handleGetPreview(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "กรุณาระบุเดือนและปีให้ถูกต้อง" },
      { status: 400 }
    );
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch expenses and incomes
  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        companyId: context.company.id,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        contact: { select: { name: true, taxId: true } },
      },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        companyId: context.company.id,
        receiveDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        contact: { select: { name: true, taxId: true } },
      },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  // Transform data
  const expensesWithFiles = expenses.map((e) => ({
    ...e,
    amount: Number(e.amount),
    vatAmount: e.vatAmount ? Number(e.vatAmount) : null,
    whtRate: e.whtRate ? Number(e.whtRate) : null,
    whtAmount: e.whtAmount ? Number(e.whtAmount) : null,
    netPaid: Number(e.netPaid),
    slipUrls: parseJsonArray(e.slipUrls),
    taxInvoiceUrls: parseJsonArray(e.taxInvoiceUrls),
    whtCertUrls: parseJsonArray(e.whtCertUrls),
  }));

  const incomesWithFiles = incomes.map((i) => ({
    ...i,
    amount: Number(i.amount),
    vatAmount: i.vatAmount ? Number(i.vatAmount) : null,
    whtRate: i.whtRate ? Number(i.whtRate) : null,
    whtAmount: i.whtAmount ? Number(i.whtAmount) : null,
    netReceived: Number(i.netReceived),
    customerSlipUrls: parseJsonArray(i.customerSlipUrls),
    myBillCopyUrls: parseJsonArray(i.myBillCopyUrls),
    whtCertUrls: parseJsonArray(i.whtCertUrls),
  }));

  const stats = getArchiveStats(expensesWithFiles, incomesWithFiles);

  return NextResponse.json({
    ...stats,
    month,
    year,
    companyCode: context.company.code,
    companyName: context.company.name,
  });
}

// POST /api/[company]/archive
// Generate and download archive
async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const body = await req.json();
    const { month, year } = body;

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "กรุณาระบุเดือนและปีให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch expenses and incomes with files
    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: {
          companyId: context.company.id,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: {
          contact: { select: { name: true, taxId: true } },
        },
        orderBy: { billDate: "asc" },
      }),
      prisma.income.findMany({
        where: {
          companyId: context.company.id,
          receiveDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: {
          contact: { select: { name: true, taxId: true } },
        },
        orderBy: { receiveDate: "asc" },
      }),
    ]);

    // Transform data with file arrays
    const expensesWithFiles = expenses.map((e) => ({
      id: e.id,
      billDate: e.billDate,
      contact: e.contact,
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
      slipUrls: parseJsonArray(e.slipUrls),
      taxInvoiceUrls: parseJsonArray(e.taxInvoiceUrls),
      whtCertUrls: parseJsonArray(e.whtCertUrls),
    }));

    const incomesWithFiles = incomes.map((i) => ({
      id: i.id,
      receiveDate: i.receiveDate,
      contact: i.contact,
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
      customerSlipUrls: parseJsonArray(i.customerSlipUrls),
      myBillCopyUrls: parseJsonArray(i.myBillCopyUrls),
      whtCertUrls: parseJsonArray(i.whtCertUrls),
    }));

    // Generate archive
    const archiveBuffer = await generateAccountingArchive({
      companyCode: context.company.code,
      companyName: context.company.name,
      month,
      year,
      expenses: expensesWithFiles,
      incomes: incomesWithFiles,
    });

    // Create filename
    const monthStr = String(month).padStart(2, "0");
    const filename = `${context.company.code}_${year}-${monthStr}.zip`;

    // Return ZIP file
    return new NextResponse(new Uint8Array(archiveBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": archiveBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Archive generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการสร้างไฟล์",
      },
      { status: 500 }
    );
  }
}

export const GET = withCompanyAccess(handleGetPreview, {
  permission: "reports:read",
  getCompanyCode: getCompanyFromPath,
});

export const POST = withCompanyAccess(handlePost, {
  permission: "reports:read",
  getCompanyCode: getCompanyFromPath,
});
