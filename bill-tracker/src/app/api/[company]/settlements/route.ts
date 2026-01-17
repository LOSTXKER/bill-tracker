import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ company: string }>;
}

/**
 * GET /api/[company]/settlements
 * Get pending settlements grouped by payer
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    // Build where clause
    // For SETTLED status, show history even if expense is deleted
    const expenseWhere: Record<string, unknown> = {
      companyId: company.id,
    };
    
    // Only filter deletedAt for PENDING status (not for history)
    if (status === "PENDING") {
      expenseWhere.deletedAt = null;
    }

    const where: Record<string, unknown> = {
      settlementStatus: status,
      Expense: expenseWhere,
    };

    if (userId) {
      where.paidByUserId = userId;
    }

    // Date filter
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get all payments matching filter
    const payments = await prisma.expensePayment.findMany({
      where,
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
        ReversedByUser: {
          select: { id: true, name: true },
        },
        Expense: {
          select: {
            id: true,
            description: true,
            billDate: true,
            netPaid: true,
            invoiceNumber: true,
            deletedAt: true, // Include to show if expense was deleted
            Contact: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [
        { paidByType: "asc" },
        { settledAt: "desc" },
      ],
    });

    // Group by payer
    const groupedByPayer: Record<string, {
      payerType: string;
      payerId: string | null;
      payerName: string;
      payerBankName: string | null;
      payerBankAccount: string | null;
      totalAmount: number;
      payments: typeof payments;
    }> = {};

    payments.forEach((payment) => {
      let key: string;
      let payerName: string;

      if (payment.paidByType === "USER" && payment.PaidByUser) {
        key = `user_${payment.paidByUserId}`;
        payerName = payment.PaidByUser.name;
      } else {
        // COMPANY or PETTY_CASH - these shouldn't have PENDING status, but handle gracefully
        key = `other_${payment.paidByType}`;
        payerName = payment.paidByType === "COMPANY" ? "บัญชีบริษัท" : "เงินสดย่อย";
      }

      if (!groupedByPayer[key]) {
        groupedByPayer[key] = {
          payerType: payment.paidByType,
          payerId: payment.paidByUserId,
          payerName,
          payerBankName: null,
          payerBankAccount: null,
          totalAmount: 0,
          payments: [],
        };
      }

      groupedByPayer[key].totalAmount += Number(payment.amount);
      groupedByPayer[key].payments.push(payment);
    });

    // Convert to array and sort by total amount
    const groups = Object.values(groupedByPayer).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return apiResponse.success({
      groups,
      totalPending: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    });
  },
  { permission: "settlements:read" }
);
