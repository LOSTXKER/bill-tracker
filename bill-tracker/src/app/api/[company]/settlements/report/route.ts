import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import type { PaidByType, SettlementStatus } from "@prisma/client";

/**
 * GET /api/[company]/settlements/report
 * Get detailed settlement report with per-person breakdown
 * 
 * Query params:
 * - dateFrom: Start date (YYYY-MM-DD)
 * - dateTo: End date (YYYY-MM-DD)
 * - status: Filter by status (PENDING, SETTLED, or empty for all)
 * 
 * Note: Only USER payer type requires settlement (COMPANY/PETTY_CASH excluded)
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const statusFilter = searchParams.get("status");

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

    // Base where clause - only USER type needs settlement
    // For SETTLED: include deleted expenses for accurate history
    // For PENDING: exclude deleted expenses
    const expenseWhere: Record<string, unknown> = {
      companyId: company.id,
    };
    
    if (statusFilter === "PENDING") {
      expenseWhere.deletedAt = null;
    }

    const baseWhere = {
      Expense: expenseWhere,
      ...(Object.keys(dateFilter).length > 0 && {
        createdAt: dateFilter,
      }),
      paidByType: "USER" as PaidByType,
    };

    // Get all payments matching the filter (for per-person breakdown)
    const allPayments = await prisma.expensePayment.findMany({
      where: {
        ...baseWhere,
        ...(statusFilter && { settlementStatus: statusFilter as SettlementStatus }),
      },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
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
      orderBy: { createdAt: "desc" },
    });

    // Summary aggregation
    const pendingAgg = await prisma.expensePayment.aggregate({
      where: {
        ...baseWhere,
        settlementStatus: "PENDING",
      },
      _sum: { amount: true },
      _count: true,
    });

    const settledAgg = await prisma.expensePayment.aggregate({
      where: {
        ...baseWhere,
        settlementStatus: "SETTLED",
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get all company members (users)
    const companyMembers = await prisma.companyAccess.findMany({
      where: {
        companyId: company.id,
      },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Initialize map with all company members
    const byPersonMap = new Map<string, {
      id: string;
      userId: string;
      name: string;
      email: string | null;
      totalSettled: number;
      settledCount: number;
      totalPending: number;
      pendingCount: number;
    }>();

    // Add all company members to the map (even those without payments)
    companyMembers.forEach((member) => {
      const personKey = `user_${member.userId}`;
      byPersonMap.set(personKey, {
        id: personKey,
        userId: member.userId,
        name: member.User.name,
        email: member.User.email,
        totalSettled: 0,
        settledCount: 0,
        totalPending: 0,
        pendingCount: 0,
      });
    });

    // Overlay payment data on top of member data
    allPayments.forEach((payment) => {
      if (!payment.PaidByUser || !payment.paidByUserId) {
        return; // Skip payments without user
      }

      const personKey = `user_${payment.paidByUserId}`;

      // If user is not a member (shouldn't happen), add them
      if (!byPersonMap.has(personKey)) {
        byPersonMap.set(personKey, {
          id: personKey,
          userId: payment.paidByUserId,
          name: payment.PaidByUser.name,
          email: payment.PaidByUser.email,
          totalSettled: 0,
          settledCount: 0,
          totalPending: 0,
          pendingCount: 0,
        });
      }

      const person = byPersonMap.get(personKey)!;
      const amount = Number(payment.amount);

      if (payment.settlementStatus === "SETTLED") {
        person.totalSettled += amount;
        person.settledCount += 1;
      } else if (payment.settlementStatus === "PENDING") {
        person.totalPending += amount;
        person.pendingCount += 1;
      }
    });

    // Convert to array and sort by pending amount (descending), then by name
    const byPerson = Array.from(byPersonMap.values()).sort(
      (a, b) => b.totalPending - a.totalPending || b.totalSettled - a.totalSettled || a.name.localeCompare(b.name)
    );

    // Group by month (last 12 months or within date range)
    const byMonthMap = new Map<string, {
      month: string;
      settled: number;
      settledCount: number;
      pending: number;
      pendingCount: number;
    }>();

    allPayments.forEach((payment) => {
      const date = payment.settledAt || payment.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, {
          month: monthKey,
          settled: 0,
          settledCount: 0,
          pending: 0,
          pendingCount: 0,
        });
      }

      const monthData = byMonthMap.get(monthKey)!;
      const amount = Number(payment.amount);

      if (payment.settlementStatus === "SETTLED") {
        monthData.settled += amount;
        monthData.settledCount += 1;
      } else if (payment.settlementStatus === "PENDING") {
        monthData.pending += amount;
        monthData.pendingCount += 1;
      }
    });

    // Convert to array and sort by month (descending)
    const byMonth = Array.from(byMonthMap.values()).sort(
      (a, b) => b.month.localeCompare(a.month)
    );

    // Count unique persons with pending settlements
    const personsWithPending = byPerson.filter((p) => p.pendingCount > 0).length;

    return apiResponse.success({
      summary: {
        totalSettled: Number(settledAgg._sum.amount) || 0,
        settledCount: settledAgg._count,
        totalPending: Number(pendingAgg._sum.amount) || 0,
        pendingCount: pendingAgg._count,
        personCount: byPerson.length,
        personsWithPending,
      },
      byPerson,
      byMonth,
      filters: {
        dateFrom,
        dateTo,
        status: statusFilter,
      },
    });
  },
  { permission: "settlements:read" }
);
