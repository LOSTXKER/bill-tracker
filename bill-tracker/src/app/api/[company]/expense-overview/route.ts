/**
 * Expense Overview API
 * GET /api/[company]/expense-overview - Get expense summary by payer type
 */

import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils/serializers";

export async function GET(
  request: Request,
  props: { params: Promise<{ company: string }> }
) {
  return withCompanyAccessFromParams(
    async (req, { company }) => {
      const url = new URL(req.url);
      const period = url.searchParams.get("period") || "month"; // month, quarter, year

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let lastPeriodStart: Date;
      let lastPeriodEnd: Date;

      switch (period) {
        case "quarter":
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          lastPeriodStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
          lastPeriodEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          lastPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
          lastPeriodEnd = new Date(now.getFullYear() - 1, 11, 31);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      }

      // Get expenses with payments grouped by payer type
      const expenses = await prisma.expense.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          billDate: { gte: startDate },
        },
        select: {
          id: true,
          netPaid: true,
          ExpensePayments: {
            select: {
              id: true,
              paidByType: true,
              paidByUserId: true,
              amount: true,
              settlementStatus: true,
              PaidByUser: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      // Get petty cash funds summary
      const pettyCashFunds = await prisma.pettyCashFund.findMany({
        where: { companyId: company.id, isActive: true },
        select: {
          id: true,
          name: true,
          currentAmount: true,
          lowThreshold: true,
        },
      });

      // Get pending settlements (expenses paid by users, not yet settled)
      const pendingSettlements = await prisma.expensePayment.findMany({
        where: {
          paidByType: "USER",
          settlementStatus: "PENDING",
          Expense: {
            companyId: company.id,
            deletedAt: null,
          },
        },
        include: {
          Expense: {
            select: { id: true, description: true, billDate: true },
          },
          PaidByUser: {
            select: { id: true, name: true },
          },
        },
      });

      // Calculate summaries
      let companyPaidTotal = 0;
      let pettyCashPaidTotal = 0;
      let userPaidTotal = 0;
      let userPendingSettlement = 0;
      let expenseCount = 0;

      // Group by user for pending settlements
      const pendingByUser: Record<string, { name: string; amount: number; count: number }> = {};

      expenses.forEach((expense) => {
        expenseCount++;
        expense.ExpensePayments.forEach((payment) => {
          const amount = toNumber(payment.amount);
          switch (payment.paidByType) {
            case "COMPANY":
              companyPaidTotal += amount;
              break;
            case "PETTY_CASH":
              pettyCashPaidTotal += amount;
              break;
            case "USER":
              userPaidTotal += amount;
              if (payment.settlementStatus === "PENDING") {
                userPendingSettlement += amount;
                const userId = payment.paidByUserId || "unknown";
                const userName = payment.PaidByUser?.name || "ไม่ระบุ";
                if (!pendingByUser[userId]) {
                  pendingByUser[userId] = { name: userName, amount: 0, count: 0 };
                }
                pendingByUser[userId].amount += amount;
                pendingByUser[userId].count++;
              }
              break;
          }
        });
      });

      // Petty cash summary
      const pettyCashBalance = pettyCashFunds.reduce(
        (sum, f) => sum + toNumber(f.currentAmount),
        0
      );
      const pettyCashLowCount = pettyCashFunds.filter(
        (f) => f.lowThreshold && toNumber(f.currentAmount) <= toNumber(f.lowThreshold)
      ).length;

      return apiResponse.success({
        period,
        startDate: startDate.toISOString(),
        summary: {
          totalExpenses: companyPaidTotal + pettyCashPaidTotal + userPaidTotal,
          expenseCount,
          byPayerType: {
            company: { total: companyPaidTotal, label: "บริษัทจ่าย" },
            pettyCash: { total: pettyCashPaidTotal, label: "เงินสดย่อย" },
            user: {
              total: userPaidTotal,
              pending: userPendingSettlement,
              settled: userPaidTotal - userPendingSettlement,
              label: "พนักงานจ่ายแทน",
            },
          },
        },
        pettyCash: {
          balance: pettyCashBalance,
          fundCount: pettyCashFunds.length,
          lowBalanceCount: pettyCashLowCount,
          funds: pettyCashFunds.map((f) => ({
            id: f.id,
            name: f.name,
            balance: toNumber(f.currentAmount),
            isLow: f.lowThreshold
              ? toNumber(f.currentAmount) <= toNumber(f.lowThreshold)
              : false,
          })),
        },
        pendingSettlements: {
          total: userPendingSettlement,
          count: pendingSettlements.length,
          byUser: Object.entries(pendingByUser).map(([userId, data]) => ({
            userId,
            name: data.name,
            amount: data.amount,
            count: data.count,
          })),
        },
      });
    },
    { permission: "expenses:read" }
  )(request, props);
}
