import { NextResponse } from "next/server";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import {
  exportExpensesToExcel,
  exportIncomesToExcel,
  exportMonthlyReport,
  exportVATReport,
  exportWHTReport,
} from "@/lib/export/excel";

export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'expenses', 'incomes', 'monthly', 'vat', 'wht'
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!type || !month || !year) {
      return apiResponse.badRequest("Missing required parameters");
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
        include: {
          contact: true,
        },
        orderBy: { billDate: "asc" },
      }),
      prisma.income.findMany({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
        },
        include: {
          contact: true,
        },
        orderBy: { receiveDate: "asc" },
      }),
    ]);

    // Transform data to match export format
    const expenseData = expenses.map((e) => ({
      billDate: e.billDate,
      vendorName: e.contact?.name || null,
      vendorTaxId: e.contact?.taxId || null,
      description: e.description,
      accountId: e.accountId,
      amount: e.amount,
      vatRate: e.vatRate,
      vatAmount: e.vatAmount,
      isWht: e.isWht,
      whtRate: e.whtRate,
      whtAmount: e.whtAmount,
      netPaid: e.netPaid,
      status: e.status,
      invoiceNumber: e.invoiceNumber,
    }));

    const incomeData = incomes.map((i) => ({
      receiveDate: i.receiveDate,
      customerName: i.contact?.name || null,
      customerTaxId: i.contact?.taxId || null,
      source: i.source,
      amount: i.amount,
      vatRate: i.vatRate,
      vatAmount: i.vatAmount,
      isWhtDeducted: i.isWhtDeducted,
      whtRate: i.whtRate,
      whtAmount: i.whtAmount,
      netReceived: i.netReceived,
      status: i.status,
      invoiceNumber: i.invoiceNumber,
    }));

    let buffer: Buffer;
    let filename: string;

    switch (type) {
      case "expenses":
        buffer = await exportExpensesToExcel(expenseData as any, company.name, period);
        filename = `รายจ่าย_${company.code}_${month}-${year}.xlsx`;
        break;
      case "incomes":
        buffer = await exportIncomesToExcel(incomeData as any, company.name, period);
        filename = `รายรับ_${company.code}_${month}-${year}.xlsx`;
        break;
      case "monthly":
        buffer = await exportMonthlyReport(
          expenseData as any,
          incomeData as any,
          company.name,
          period
        );
        filename = `สรุปรายเดือน_${company.code}_${month}-${year}.xlsx`;
        break;
      case "vat":
        buffer = await exportVATReport(
          expenseData as any,
          incomeData as any,
          company.name,
          period
        );
        filename = `รายงาน_VAT_${company.code}_${month}-${year}.xlsx`;
        break;
      case "wht":
        buffer = await exportWHTReport(
          expenseData as any,
          incomeData as any,
          company.name,
          period
        );
        filename = `รายงาน_WHT_${company.code}_${month}-${year}.xlsx`;
        break;
      default:
        return apiResponse.badRequest("Invalid export type");
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  },
  { permission: "reports:export" }
);
