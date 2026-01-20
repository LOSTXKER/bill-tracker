import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/[company]/contacts/report
 * Get expense/income report grouped by contacts (vendors/customers)
 * 
 * Query params:
 * - dateFrom: Start date (YYYY-MM-DD)
 * - dateTo: End date (YYYY-MM-DD)
 * - type: Contact type filter (VENDOR, CUSTOMER, or empty for all)
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const typeFilter = searchParams.get("type");

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    // Get all contacts for this company
    const contacts = await prisma.contact.findMany({
      where: {
        companyId: company.id,
        ...(typeFilter === "VENDOR" && { contactCategory: "VENDOR" }),
        ...(typeFilter === "CUSTOMER" && { contactCategory: "CUSTOMER" }),
      },
      select: {
        id: true,
        name: true,
        contactCategory: true,
        taxId: true,
      },
    });

    // Get expenses grouped by contact
    const expensesByContact = await prisma.expense.groupBy({
      by: ["contactId"],
      where: {
        companyId: company.id,
        deletedAt: null,
        contactId: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter }),
      },
      _sum: { netPaid: true, amount: true, vatAmount: true, whtAmount: true },
      _count: true,
    });

    // Get incomes grouped by contact
    const incomesByContact = await prisma.income.groupBy({
      by: ["contactId"],
      where: {
        companyId: company.id,
        deletedAt: null,
        contactId: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { receiveDate: dateFilter }),
      },
      _sum: { netReceived: true, amount: true, vatAmount: true, whtAmount: true },
      _count: true,
    });

    // Get expenses without contact
    const expensesNoContact = await prisma.expense.aggregate({
      where: {
        companyId: company.id,
        deletedAt: null,
        contactId: null,
        ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter }),
      },
      _sum: { netPaid: true, amount: true, vatAmount: true, whtAmount: true },
      _count: true,
    });

    // Get incomes without contact
    const incomesNoContact = await prisma.income.aggregate({
      where: {
        companyId: company.id,
        deletedAt: null,
        contactId: null,
        ...(Object.keys(dateFilter).length > 0 && { receiveDate: dateFilter }),
      },
      _sum: { netReceived: true, amount: true, vatAmount: true, whtAmount: true },
      _count: true,
    });

    // Create lookup maps
    const expenseMap = new Map(
      expensesByContact.map((e) => [
        e.contactId,
        {
          amount: Number(e._sum.amount) || 0,
          netPaid: Number(e._sum.netPaid) || 0,
          vatAmount: Number(e._sum.vatAmount) || 0,
          whtAmount: Number(e._sum.whtAmount) || 0,
          count: e._count,
        },
      ])
    );

    const incomeMap = new Map(
      incomesByContact.map((i) => [
        i.contactId,
        {
          amount: Number(i._sum.amount) || 0,
          netReceived: Number(i._sum.netReceived) || 0,
          vatAmount: Number(i._sum.vatAmount) || 0,
          whtAmount: Number(i._sum.whtAmount) || 0,
          count: i._count,
        },
      ])
    );

    // Build per-contact data
    const byContact = contacts
      .map((contact) => {
        const expense = expenseMap.get(contact.id);
        const income = incomeMap.get(contact.id);
        return {
          id: contact.id,
          name: contact.name,
          category: contact.contactCategory,
          taxId: contact.taxId,
          expense: expense || { amount: 0, netPaid: 0, vatAmount: 0, whtAmount: 0, count: 0 },
          income: income || { amount: 0, netReceived: 0, vatAmount: 0, whtAmount: 0, count: 0 },
          total: (expense?.netPaid || 0) + (income?.netReceived || 0),
          totalCount: (expense?.count || 0) + (income?.count || 0),
        };
      })
      .filter((c) => c.totalCount > 0) // Only include contacts with transactions
      .sort((a, b) => b.total - a.total);

    // Get monthly breakdown
    const expensesByMonth = await prisma.expense.groupBy({
      by: ["billDate"],
      where: {
        companyId: company.id,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter }),
      },
      _sum: { netPaid: true },
      _count: true,
    });

    const incomesByMonth = await prisma.income.groupBy({
      by: ["receiveDate"],
      where: {
        companyId: company.id,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { receiveDate: dateFilter }),
      },
      _sum: { netReceived: true },
      _count: true,
    });

    // Aggregate by month
    const byMonthMap = new Map<
      string,
      { month: string; expenses: number; expenseCount: number; incomes: number; incomeCount: number }
    >();

    expensesByMonth.forEach((e) => {
      const monthKey = `${e.billDate.getFullYear()}-${String(e.billDate.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, { month: monthKey, expenses: 0, expenseCount: 0, incomes: 0, incomeCount: 0 });
      }
      const monthData = byMonthMap.get(monthKey)!;
      monthData.expenses += Number(e._sum.netPaid) || 0;
      monthData.expenseCount += e._count;
    });

    incomesByMonth.forEach((i) => {
      const monthKey = `${i.receiveDate.getFullYear()}-${String(i.receiveDate.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, { month: monthKey, expenses: 0, expenseCount: 0, incomes: 0, incomeCount: 0 });
      }
      const monthData = byMonthMap.get(monthKey)!;
      monthData.incomes += Number(i._sum.netReceived) || 0;
      monthData.incomeCount += i._count;
    });

    const byMonth = Array.from(byMonthMap.values()).sort((a, b) => b.month.localeCompare(a.month));

    // Summary calculations
    const totalExpenses = byContact.reduce((sum, c) => sum + c.expense.netPaid, 0);
    const totalIncomes = byContact.reduce((sum, c) => sum + c.income.netReceived, 0);
    const totalExpenseCount = byContact.reduce((sum, c) => sum + c.expense.count, 0);
    const totalIncomeCount = byContact.reduce((sum, c) => sum + c.income.count, 0);
    const vendorCount = byContact.filter((c) => c.category === "VENDOR").length;
    const customerCount = byContact.filter((c) => c.category === "CUSTOMER").length;

    return apiResponse.success({
      summary: {
        totalExpenses,
        expenseCount: totalExpenseCount,
        totalIncomes,
        incomeCount: totalIncomeCount,
        contactCount: byContact.length,
        vendorCount,
        customerCount,
        noContactExpenses: Number(expensesNoContact._sum.netPaid) || 0,
        noContactExpenseCount: expensesNoContact._count,
        noContactIncomes: Number(incomesNoContact._sum.netReceived) || 0,
        noContactIncomeCount: incomesNoContact._count,
      },
      byContact,
      byMonth,
      filters: {
        dateFrom,
        dateTo,
        type: typeFilter,
      },
    });
  },
  { permission: "expenses:read" }
);
