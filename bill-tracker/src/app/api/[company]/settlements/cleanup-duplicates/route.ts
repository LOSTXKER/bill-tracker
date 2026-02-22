import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * POST /api/[company]/settlements/cleanup-duplicates
 * Find and remove duplicate ExpensePayment records.
 * Keeps the oldest record for each unique payer per expense.
 */
export const POST = withCompanyAccessFromParams(
  async (_request, { company }) => {
    const allPayments = await prisma.expensePayment.findMany({
      where: {
        Expense: { companyId: company.id },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        expenseId: true,
        paidByType: true,
        paidByUserId: true,
        paidByPettyCashFundId: true,
        amount: true,
        settlementStatus: true,
        createdAt: true,
      },
    });

    const seen = new Map<string, string>();
    const duplicateIds: string[] = [];

    for (const payment of allPayments) {
      let key: string;
      if (payment.paidByType === "USER" && payment.paidByUserId) {
        key = `${payment.expenseId}:USER:${payment.paidByUserId}`;
      } else if (payment.paidByType === "PETTY_CASH" && payment.paidByPettyCashFundId) {
        key = `${payment.expenseId}:PETTY_CASH:${payment.paidByPettyCashFundId}`;
      } else {
        key = `${payment.expenseId}:${payment.paidByType}:${payment.amount}`;
      }

      if (seen.has(key)) {
        duplicateIds.push(payment.id);
      } else {
        seen.set(key, payment.id);
      }
    }

    if (duplicateIds.length === 0) {
      return apiResponse.success({
        message: "ไม่พบรายการซ้ำ",
        removedCount: 0,
      });
    }

    await prisma.expensePayment.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    return apiResponse.success({
      message: `ลบรายการผู้จ่ายเงินซ้ำแล้ว ${duplicateIds.length} รายการ`,
      removedCount: duplicateIds.length,
      removedIds: duplicateIds,
    });
  },
  { permission: "expenses:update" }
);
