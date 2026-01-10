import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/reimbursement-requests/analytics?company=ABC
 * 
 * Get reimbursement analytics (ranking, trends, overall stats)
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      // Build date filter
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      const where: any = {
        companyId: company.id,
        status: "PAID", // Only count paid requests
      };

      if (Object.keys(dateFilter).length > 0) {
        where.paidAt = dateFilter;
      }

      // Fetch all paid requests
      const requests = await prisma.reimbursementRequest.findMany({
        where,
        select: {
          id: true,
          requesterName: true,
          netAmount: true,
          paidAt: true,
        },
        orderBy: { paidAt: "desc" },
      });

      // 1. Ranking by requester
      const requesterStats: Record<
        string,
        { name: string; count: number; total: number }
      > = {};

      requests.forEach((req) => {
        const name = req.requesterName;
        if (!requesterStats[name]) {
          requesterStats[name] = { name, count: 0, total: 0 };
        }
        requesterStats[name].count += 1;
        requesterStats[name].total += Number(req.netAmount);
      });

      const ranking = Object.values(requesterStats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10

      // 2. Monthly trends (last 12 months)
      const monthlyTrends: Record<string, { count: number; total: number }> = {};

      requests.forEach((req) => {
        if (!req.paidAt) return;
        const monthKey = req.paidAt.toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyTrends[monthKey]) {
          monthlyTrends[monthKey] = { count: 0, total: 0 };
        }
        monthlyTrends[monthKey].count += 1;
        monthlyTrends[monthKey].total += Number(req.netAmount);
      });

      const trends = Object.entries(monthlyTrends)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // 3. Overall stats
      const totalCount = requests.length;
      const totalAmount = requests.reduce(
        (sum, req) => sum + Number(req.netAmount),
        0
      );
      const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

      return apiResponse.success({
        stats: {
          totalCount,
          totalAmount,
          averageAmount,
        },
        ranking,
        trends,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return apiResponse.error("Failed to fetch analytics");
    }
  },
  { permission: "reimbursements:read" }
);
