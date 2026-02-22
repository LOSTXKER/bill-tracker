import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ company: string }>;
}

/**
 * GET /api/[company]/settlements/summary
 * Get settlement summary for dashboard
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get all pending payments (only approved/not-required expenses)
    const pendingPayments = await prisma.expensePayment.findMany({
      where: {
        settlementStatus: "PENDING",
        Expense: {
          companyId: company.id,
          deletedAt: null,
          approvalStatus: { in: ["APPROVED", "NOT_REQUIRED"] },
        },
      },
      select: {
        id: true,
        amount: true,
        paidByType: true,
        paidByUserId: true,
        paidByName: true,
        PaidByUser: {
          select: { id: true, name: true },
        },
      },
    });

    // Count payments blocked by pending approval
    const pendingApprovalCount = await prisma.expensePayment.count({
      where: {
        settlementStatus: "PENDING",
        paidByType: "USER",
        Expense: {
          companyId: company.id,
          deletedAt: null,
          approvalStatus: "PENDING",
        },
      },
    });

    // Get settled this month (exclude deleted expenses for accurate stats)
    const settledThisMonth = await prisma.expensePayment.aggregate({
      where: {
        settlementStatus: "SETTLED",
        settledAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        Expense: {
          companyId: company.id,
          deletedAt: null, // Exclude deleted for stats
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Group pending by user (top 5) - only USER type needs settlement
    const pendingByUser: Record<string, {
      userId: string | null;
      name: string;
      count: number;
      amount: number;
    }> = {};

    pendingPayments.forEach((payment) => {
      const type = payment.paidByType;
      if (type === "USER" && payment.PaidByUser) {
        const key = payment.paidByUserId || "unknown";
        const name = payment.PaidByUser.name;

        if (!pendingByUser[key]) {
          pendingByUser[key] = {
            userId: payment.paidByUserId,
            name,
            count: 0,
            amount: 0,
          };
        }
        pendingByUser[key].count += 1;
        pendingByUser[key].amount += Number(payment.amount);
      }
    });

    // Get top 5 pending users sorted by amount
    const topPendingUsers = Object.values(pendingByUser)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate totals - only USER type
    const totalPendingCount = pendingPayments.filter(
      (p) => p.paidByType === "USER"
    ).length;
    
    const totalPendingAmount = pendingPayments
      .filter((p) => p.paidByType === "USER")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // OPTIMIZED: Add short-lived cache to reduce DB load
    // 5 second cache with 30 second stale-while-revalidate for dashboard summary
    return apiResponse.successWithCache(
      {
        pending: {
          total: {
            count: totalPendingCount,
            amount: totalPendingAmount,
          },
          topUsers: topPendingUsers,
          pendingApprovalCount,
        },
        settledThisMonth: {
          count: settledThisMonth._count,
          amount: Number(settledThisMonth._sum.amount) || 0,
        },
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      undefined,
      { maxAge: 5, staleWhileRevalidate: 30 }
    );
  },
  { permission: "settlements:read" }
);
