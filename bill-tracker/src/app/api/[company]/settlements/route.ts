import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ company: string }>;
}

/**
 * GET /api/[company]/settlements
 * Get pending settlements grouped by payer or by settlement round
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const groupBy = searchParams.get("groupBy") || "payer"; // "payer" or "round"
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

    // Date filter - for SETTLED status, filter by settledAt; for PENDING, filter by createdAt
    const dateField = status === "SETTLED" ? "settledAt" : "createdAt";
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where[dateField] = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      where[dateField] = {
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
        { settledAt: "desc" },
        { paidByType: "asc" },
      ],
    });

    // Group by round (settledAt timestamp) for SETTLED status
    if (status === "SETTLED" && groupBy === "round") {
      const groupedByRound: Record<string, {
        roundKey: string;
        settledAt: Date;
        settlementRef: string | null;
        settlementSlipUrls: string[];
        settledBy: { id: string; name: string } | null;
        payments: typeof payments;
        totalAmount: number;
        payerSummary: string;
      }> = {};

      payments.forEach((payment) => {
        if (!payment.settledAt) return;
        
        // Use settledAt timestamp as round key (same second = same round)
        const roundKey = payment.settledAt.toISOString();

        if (!groupedByRound[roundKey]) {
          groupedByRound[roundKey] = {
            roundKey,
            settledAt: payment.settledAt,
            settlementRef: payment.settlementRef,
            settlementSlipUrls: (payment.settlementSlipUrls as string[]) || [],
            settledBy: payment.SettledByUser,
            payments: [],
            totalAmount: 0,
            payerSummary: "",
          };
        }

        groupedByRound[roundKey].payments.push(payment);
        groupedByRound[roundKey].totalAmount += Number(payment.amount);
      });

      // Calculate payer summary for each round
      Object.values(groupedByRound).forEach((round) => {
        const payerCounts: Record<string, number> = {};
        round.payments.forEach((p) => {
          const name = p.PaidByUser?.name || "ไม่ระบุ";
          payerCounts[name] = (payerCounts[name] || 0) + 1;
        });
        round.payerSummary = Object.entries(payerCounts)
          .map(([name, count]) => `${name} (${count} รายการ)`)
          .join(", ");
      });

      // Convert to array and sort by settledAt desc
      const rounds = Object.values(groupedByRound).sort(
        (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
      );

      return apiResponse.successWithCache(
        {
          rounds,
          totalSettled: payments.length,
          totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
        },
        undefined,
        { maxAge: 5, staleWhileRevalidate: 30 }
      );
    }

    // Group by payer (default)
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

    // OPTIMIZED: Add short-lived cache to reduce DB load
    // 5 second cache with 30 second stale-while-revalidate for settlements list
    return apiResponse.successWithCache(
      {
        groups,
        totalPending: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      },
      undefined,
      { maxAge: 5, staleWhileRevalidate: 30 }
    );
  },
  { permission: "settlements:read" }
);
