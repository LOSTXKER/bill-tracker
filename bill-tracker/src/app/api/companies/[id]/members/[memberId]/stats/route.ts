/**
 * Employee Stats API
 * 
 * Endpoint for fetching employee reimbursement statistics
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";

/**
 * GET /api/companies/[id]/members/[memberId]/stats
 * 
 * Get reimbursement statistics for a specific employee
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  return withAuth(async (req, { session }) => {
    const { id: companyId, memberId } = await params;

    // Check if user has permission to view employee data
    // Either they are viewing their own data, or they have team management permissions
    const isOwnProfile = session.user.id === memberId;
    
    if (!isOwnProfile) {
      const canManageTeam = await hasPermission(
        session.user.id,
        companyId,
        "settings:manage-team"
      );

      if (!canManageTeam) {
        return apiResponse.forbidden("You don't have permission to view employee stats");
      }
    }

    // Get reimbursement statistics
    const [total, pending, approved, paid, rejected] = await Promise.all([
      // Total reimbursements
      prisma.reimbursementRequest.count({
        where: {
          companyId,
          requesterId: memberId,
        },
      }),
      // Pending approval
      prisma.reimbursementRequest.count({
        where: {
          companyId,
          requesterId: memberId,
          status: "PENDING",
        },
      }),
      // Approved (waiting payment)
      prisma.reimbursementRequest.count({
        where: {
          companyId,
          requesterId: memberId,
          status: "APPROVED",
        },
      }),
      // Paid
      prisma.reimbursementRequest.count({
        where: {
          companyId,
          requesterId: memberId,
          status: "PAID",
        },
      }),
      // Rejected
      prisma.reimbursementRequest.count({
        where: {
          companyId,
          requesterId: memberId,
          status: "REJECTED",
        },
      }),
    ]);

    // Get total amounts
    const amounts = await prisma.reimbursementRequest.groupBy({
      by: ["status"],
      where: {
        companyId,
        requesterId: memberId,
      },
      _sum: {
        netAmount: true,
      },
    });

    const amountMap: Record<string, number> = {};
    amounts.forEach((item) => {
      amountMap[item.status] = item._sum.netAmount?.toNumber() || 0;
    });

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await prisma.reimbursementRequest.groupBy({
      by: ["billDate"],
      where: {
        companyId,
        requesterId: memberId,
        billDate: {
          gte: sixMonthsAgo,
        },
      },
      _sum: {
        netAmount: true,
      },
      _count: true,
    });

    // Get recent activity count
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.auditLog.count({
      where: {
        companyId,
        userId: memberId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return apiResponse.success({
      stats: {
        reimbursements: {
          total,
          pending,
          approved,
          paid,
          rejected,
        },
        amounts: {
          total: Object.values(amountMap).reduce((sum, val) => sum + val, 0),
          pending: amountMap.PENDING || 0,
          approved: amountMap.APPROVED || 0,
          paid: amountMap.PAID || 0,
          rejected: amountMap.REJECTED || 0,
        },
        recentActivity: {
          last30Days: recentActivity,
        },
      },
    });
  })(request);
}
