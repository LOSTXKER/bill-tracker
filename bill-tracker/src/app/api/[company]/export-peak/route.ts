import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { exportExpensesToPEAK } from "@/lib/export/peak-export";
import { apiResponse } from "@/lib/api/response";
import { getThaiMonthRange } from "@/lib/queries/date-utils";
import { buildExpenseBaseWhere } from "@/lib/queries/expense-filters";

// POST /api/[company]/export-peak
// Generate and download PEAK-format Excel file
async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const body = await req.json();
    const { month, year, status } = body;

    if (!month || !year || month < 1 || month > 12) {
      return apiResponse.badRequest("กรุณาระบุเดือนและปีให้ถูกต้อง");
    }

    const { startDate, endDate } = getThaiMonthRange(year, month);

    // Build where clause
    const baseWhere = {
      ...buildExpenseBaseWhere(context.company.id),
      billDate: { gte: startDate, lte: endDate },
      ...(status && Array.isArray(status) && status.length > 0 && { status: { in: status } }),
    };

    // Fetch expenses with account and contact info
    const expensesRaw = await prisma.expense.findMany({
      where: baseWhere,
      include: {
        Account: {
          select: {
            code: true,
            name: true,
          },
        },
        Contact: {
          select: {
            name: true,
            taxId: true,
            branchCode: true,
            type: true,
          },
        },
      },
      orderBy: { billDate: "asc" },
    });
    const expenses = expensesRaw.map((e) => ({ ...e, account: e.Account, contact: e.Contact }));

    if (expenses.length === 0) {
      return apiResponse.notFound("ไม่พบข้อมูลรายจ่ายในช่วงเวลาที่เลือก");
    }

    // Transform data for PEAK export
    const peakData = expenses.map((expense) => ({
      billDate: expense.billDate,
      referenceNo: expense.referenceNo,
      invoiceNumber: expense.invoiceNumber,
      taxInvoiceDate: expense.billDate, // Use bill date as tax invoice date
      
      // Contact Info
      vendorName: expense.contact?.name || expense.contactName || null,
      vendorTaxId: expense.contact?.taxId || null,
      vendorBranchCode: expense.contact?.branchCode || "00000",
      vendorContactType: expense.contact?.type || "COMPANY",
      
      // Financial Data
      amount: Number(expense.amount),
      vatRate: expense.vatRate,
      vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
      whtRate: expense.isWht && expense.whtRate ? Number(expense.whtRate) : null,
      whtAmount: expense.isWht && expense.whtAmount ? Number(expense.whtAmount) : null,
      whtType: expense.whtType,
      netPaid: Number(expense.netPaid),
      
      // Account Info
      accountCode: expense.account?.code || null,
      description: expense.description,
      notes: expense.notes,
      
      // Payment info
      paymentMethod: expense.paymentMethod,
    }));

    // Generate Excel
    const excelBuffer = await exportExpensesToPEAK(
      peakData,
      context.company.name,
      `${month}/${year}`
    );

    // Create filename
    const monthStr = String(month).padStart(2, "0");
    const filename = `PEAK_${context.company.code}_${year}${monthStr}.xlsx`;

    // Return Excel file
    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PEAK export error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาดในการสร้างไฟล์ Excel"
    );
  }
}

// GET /api/[company]/export-peak?month=1&year=2026&preview=true
// Returns preview stats
async function handleGet(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");

  if (!month || !year || month < 1 || month > 12) {
    return apiResponse.badRequest("กรุณาระบุเดือนและปีให้ถูกต้อง");
  }

  const { startDate, endDate } = getThaiMonthRange(year, month);

  // Count expenses
  const baseCountWhere = { ...buildExpenseBaseWhere(context.company.id), billDate: { gte: startDate, lte: endDate } };
  const [total, withAccount, withoutAccount, withWHT] = await Promise.all([
    prisma.expense.count({ where: baseCountWhere }),
    prisma.expense.count({ where: { ...baseCountWhere, accountId: { not: null } } }),
    prisma.expense.count({ where: { ...baseCountWhere, accountId: null } }),
    prisma.expense.count({ where: { ...baseCountWhere, isWht: true } }),
  ]);

  return apiResponse.success({
    total,
    withAccount,
    withoutAccount,
    withWHT,
    readyForExport: withoutAccount === 0,
    warnings: withoutAccount > 0 
      ? [`มีรายการ ${withoutAccount} รายการที่ยังไม่ได้กำหนดรหัสบัญชี`]
      : [],
  });
}

export const GET = withCompanyAccessFromParams(handleGet, {
  permission: "reports:read",
});

export const POST = withCompanyAccessFromParams(handlePost, {
  permission: "reports:read",
});
