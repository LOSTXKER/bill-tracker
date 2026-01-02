import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  exportExpensesToExcel,
  exportIncomesToExcel,
  exportMonthlyReport,
  exportVATReport,
  exportWHTReport,
} from "@/lib/export/excel";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get("company");
    const type = searchParams.get("type"); // 'expenses', 'incomes', 'monthly', 'vat', 'wht'
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!companyCode || !type || !month || !year) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check user access
    const hasAccess =
      session.user.role === "ADMIN" ||
      (await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: session.user.id,
            companyId: company.id,
          },
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const period = `${month}/${year}`;

    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: {
          companyId: company.id,
          billDate: { gte: startDate, lte: endDate },
        },
        orderBy: { billDate: "asc" },
        select: {
          billDate: true,
          vendorName: true,
          vendorTaxId: true,
          description: true,
          category: true,
          amount: true,
          vatRate: true,
          vatAmount: true,
          isWht: true,
          whtRate: true,
          whtAmount: true,
          netPaid: true,
          status: true,
          invoiceNumber: true,
        },
      }),
      prisma.income.findMany({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
        },
        orderBy: { receiveDate: "asc" },
        select: {
          receiveDate: true,
          customerName: true,
          customerTaxId: true,
          source: true,
          amount: true,
          vatRate: true,
          vatAmount: true,
          isWhtDeducted: true,
          whtRate: true,
          whtAmount: true,
          netReceived: true,
          status: true,
          invoiceNumber: true,
        },
      }),
    ]);

    let buffer: Buffer;
    let filename: string;

    switch (type) {
      case "expenses":
        buffer = await exportExpensesToExcel(expenses as any, company.name, period);
        filename = `รายจ่าย_${companyCode}_${month}-${year}.xlsx`;
        break;
      case "incomes":
        buffer = await exportIncomesToExcel(incomes as any, company.name, period);
        filename = `รายรับ_${companyCode}_${month}-${year}.xlsx`;
        break;
      case "monthly":
        buffer = await exportMonthlyReport(
          expenses as any,
          incomes as any,
          company.name,
          period
        );
        filename = `สรุปรายเดือน_${companyCode}_${month}-${year}.xlsx`;
        break;
      case "vat":
        buffer = await exportVATReport(
          expenses as any,
          incomes as any,
          company.name,
          period
        );
        filename = `รายงาน_VAT_${companyCode}_${month}-${year}.xlsx`;
        break;
      case "wht":
        buffer = await exportWHTReport(
          expenses as any,
          incomes as any,
          company.name,
          period
        );
        filename = `รายงาน_WHT_${companyCode}_${month}-${year}.xlsx`;
        break;
      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
