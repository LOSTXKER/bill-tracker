/**
 * Document Events API
 * ดึง Timeline Events ของ transaction
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

// =============================================================================
// GET: ดึง Timeline Events
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get("expenseId");
    const incomeId = searchParams.get("incomeId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!expenseId && !incomeId) {
      return apiResponse.badRequest("expenseId or incomeId is required");
    }

    const where: any = {};
    
    if (expenseId) {
      // Verify expense belongs to company
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { companyId: true },
      });
      if (!expense || expense.companyId !== company.id) {
        return apiResponse.notFound("Expense not found");
      }
      where.expenseId = expenseId;
    }

    if (incomeId) {
      // Verify income belongs to company
      const income = await prisma.income.findUnique({
        where: { id: incomeId },
        select: { companyId: true },
      });
      if (!income || income.companyId !== company.id) {
        return apiResponse.notFound("Income not found");
      }
      where.incomeId = incomeId;
    }

    const eventsRaw = await prisma.documentEvent.findMany({
      where,
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { eventDate: "desc" },
      take: limit,
    });

    const events = eventsRaw.map((e) => ({ ...e, creator: e.User }));
    return apiResponse.success(events);
  }
);
