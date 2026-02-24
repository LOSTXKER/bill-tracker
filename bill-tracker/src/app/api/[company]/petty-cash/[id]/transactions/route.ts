/**
 * Petty Cash Transactions API
 * GET /api/[company]/petty-cash/[id]/transactions - List all transactions
 */

import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils/serializers";

export async function GET(
  request: Request,
  props: { params: Promise<{ company: string; id: string }> }
) {
  return withCompanyAccessFromParams(
    async (req, { company }) => {
      const { id } = await props.params;
      const url = new URL(req.url);
      const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50") || 50), 100);
      const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0") || 0);
      const type = url.searchParams.get("type"); // EXPENSE, REPLENISH, ADJUSTMENT

      const fund = await prisma.pettyCashFund.findFirst({
        where: { id, companyId: company.id },
      });

      if (!fund) {
        return apiResponse.notFound("ไม่พบกองทุนเงินสดย่อย");
      }

      const whereClause: any = { fundId: id };
      if (type) {
        whereClause.type = type;
      }

      const [transactions, total] = await prisma.$transaction([
        prisma.pettyCashTransaction.findMany({
          where: whereClause,
          include: {
            Expense: {
              select: {
                id: true,
                description: true,
                billDate: true,
                Contact: {
                  select: { id: true, name: true },
                },
              },
            },
            User: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.pettyCashTransaction.count({
          where: whereClause,
        }),
      ]);

      // Calculate summary by type
      const allTransactions = await prisma.pettyCashTransaction.groupBy({
        by: ["type"],
        where: { fundId: id },
        _sum: { amount: true },
        _count: true,
      });

      const summary = {
        totalExpense: 0,
        totalReplenish: 0,
        totalAdjustment: 0,
        expenseCount: 0,
        replenishCount: 0,
        adjustmentCount: 0,
      };

      allTransactions.forEach((t) => {
        const amount = toNumber(t._sum.amount);
        switch (t.type) {
          case "EXPENSE":
            summary.totalExpense = amount;
            summary.expenseCount = t._count;
            break;
          case "REPLENISH":
            summary.totalReplenish = amount;
            summary.replenishCount = t._count;
            break;
          case "ADJUSTMENT":
            summary.totalAdjustment = amount;
            summary.adjustmentCount = t._count;
            break;
        }
      });

      return apiResponse.success({
        transactions: transactions.map((t) => ({
          ...t,
          amount: toNumber(t.amount),
        })),
        summary,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
    { permission: "expenses:read" }
  )(request, props);
}
