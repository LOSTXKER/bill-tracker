import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ company: string }>;
}

// Thai month names for label generation
const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

/**
 * GET /api/[company]/settlements
 * Get pending settlements grouped by payer, by month+payer, or by settlement round
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const groupBy = searchParams.get("groupBy") || "payer"; // "payer", "monthPayer", or "round"
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

    // For PENDING with month/year filter, filter by billDate on Expense
    if (status === "PENDING" && (month || year)) {
      if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        expenseWhere.billDate = {
          gte: startDate,
          lte: endDate,
        };
      } else if (year) {
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
        expenseWhere.billDate = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

    const where: Record<string, unknown> = {
      settlementStatus: status,
      Expense: expenseWhere,
    };

    if (userId) {
      where.paidByUserId = userId;
    }

    // Date filter for SETTLED status - filter by settledAt
    if (status === "SETTLED") {
      if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        where.settledAt = {
          gte: startDate,
          lte: endDate,
        };
      } else if (year) {
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
        where.settledAt = {
          gte: startDate,
          lte: endDate,
        };
      }
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
        // Only count amount if expense is not deleted
        if (!payment.Expense.deletedAt) {
          groupedByRound[roundKey].totalAmount += Number(payment.amount);
        }
      });

      // Calculate payer summary for each round (only count non-deleted)
      Object.values(groupedByRound).forEach((round) => {
        const payerCounts: Record<string, number> = {};
        round.payments.forEach((p) => {
          if (!p.Expense.deletedAt) {
            const name = p.PaidByUser?.name || "ไม่ระบุ";
            payerCounts[name] = (payerCounts[name] || 0) + 1;
          }
        });
        round.payerSummary = Object.entries(payerCounts)
          .map(([name, count]) => `${name} (${count} รายการ)`)
          .join(", ");
      });

      // Convert to array and sort by settledAt desc
      const rounds = Object.values(groupedByRound).sort(
        (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
      );

      // Filter out deleted expenses for totals
      const activePayments = payments.filter((p) => !p.Expense.deletedAt);
      
      return apiResponse.successWithCache(
        {
          rounds,
          totalSettled: activePayments.length,
          totalAmount: activePayments.reduce((sum, p) => sum + Number(p.amount), 0),
        },
        undefined,
        { maxAge: 5, staleWhileRevalidate: 30 }
      );
    }

    // Group by month then payer (for PENDING status)
    if (status === "PENDING" && groupBy === "monthPayer") {
      // First, group by month (using billDate)
      const groupedByMonth: Record<string, {
        monthKey: string;
        monthLabel: string;
        totalAmount: number;
        payerGroups: Record<string, {
          payerType: string;
          payerId: string | null;
          payerName: string;
          payerBankName: string | null;
          payerBankAccount: string | null;
          totalAmount: number;
          payments: typeof payments;
        }>;
      }> = {};

      payments.forEach((payment) => {
        const billDate = new Date(payment.Expense.billDate);
        const monthKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
        const buddhistYear = billDate.getFullYear() + 543;
        const monthLabel = `${thaiMonths[billDate.getMonth()]} ${buddhistYear}`;

        if (!groupedByMonth[monthKey]) {
          groupedByMonth[monthKey] = {
            monthKey,
            monthLabel,
            totalAmount: 0,
            payerGroups: {},
          };
        }

        // Now group by payer within the month
        let payerKey: string;
        let payerName: string;

        if (payment.paidByType === "USER" && payment.PaidByUser) {
          payerKey = `user_${payment.paidByUserId}`;
          payerName = payment.PaidByUser.name;
        } else {
          payerKey = `other_${payment.paidByType}`;
          payerName = payment.paidByType === "COMPANY" ? "บัญชีบริษัท" : "เงินสดย่อย";
        }

        if (!groupedByMonth[monthKey].payerGroups[payerKey]) {
          groupedByMonth[monthKey].payerGroups[payerKey] = {
            payerType: payment.paidByType,
            payerId: payment.paidByUserId,
            payerName,
            payerBankName: null,
            payerBankAccount: null,
            totalAmount: 0,
            payments: [],
          };
        }

        groupedByMonth[monthKey].totalAmount += Number(payment.amount);
        groupedByMonth[monthKey].payerGroups[payerKey].totalAmount += Number(payment.amount);
        groupedByMonth[monthKey].payerGroups[payerKey].payments.push(payment);
      });

      // Convert to array format and sort
      const monthGroups = Object.values(groupedByMonth)
        .map((month) => ({
          ...month,
          payerGroups: Object.values(month.payerGroups).sort(
            (a, b) => b.totalAmount - a.totalAmount
          ),
        }))
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Sort by month descending (newest first)

      return apiResponse.successWithCache(
        {
          monthGroups,
          totalPending: payments.length,
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
