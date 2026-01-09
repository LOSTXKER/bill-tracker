import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * @deprecated This endpoint uses the legacy Expense-based reimbursement system.
 * Please use /api/reimbursement-requests/summary instead.
 * 
 * GET /api/reimbursements/summary?company=ABC
 * สรุปยอดค้างจ่ายแต่ละคน
 * 
 * Migration: Use /api/reimbursement-requests/summary
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    // Log deprecation warning
    console.warn(
      "[DEPRECATED] /api/reimbursements/summary is deprecated. Use /api/reimbursement-requests/summary instead."
    );

    // Get summary by status
    const statusSummary = await prisma.expense.groupBy({
      by: ["reimbursementStatus"],
      where: {
        companyId: company.id,
        isReimbursement: true,
        deletedAt: null,
        reimbursementStatus: { not: null },
      },
      _sum: { netPaid: true },
      _count: true,
    });

    // Get pending payouts by requester (APPROVED status = waiting for payment)
    const pendingPayoutsByUser = await prisma.expense.groupBy({
      by: ["requesterId"],
      where: {
        companyId: company.id,
        isReimbursement: true,
        reimbursementStatus: "APPROVED",
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    });

    // Get user details for each requester
    const requesterIds = pendingPayoutsByUser
      .map((p) => p.requesterId)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: requesterIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Build pending payouts with user info
    const pendingPayouts = pendingPayoutsByUser.map((p) => ({
      requesterId: p.requesterId,
      requester: p.requesterId ? userMap.get(p.requesterId) : null,
      totalAmount: p._sum.netPaid ? Number(p._sum.netPaid) : 0,
      count: p._count,
    }));

    // Get detailed list of approved (pending payment) reimbursements
    const pendingPaymentsList = await prisma.expense.findMany({
      where: {
        companyId: company.id,
        isReimbursement: true,
        reimbursementStatus: "APPROVED",
        deletedAt: null,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        categoryRef: true,
        reimbursementApprover: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { requesterId: "asc" },
        { reimbursementApprovedAt: "asc" },
      ],
    });

    // Calculate totals
    const totalPendingApproval = statusSummary.find(
      (s) => s.reimbursementStatus === "PENDING"
    );
    const totalFlagged = statusSummary.find(
      (s) => s.reimbursementStatus === "FLAGGED"
    );
    const totalApproved = statusSummary.find(
      (s) => s.reimbursementStatus === "APPROVED"
    );
    const totalPaid = statusSummary.find(
      (s) => s.reimbursementStatus === "PAID"
    );
    const totalRejected = statusSummary.find(
      (s) => s.reimbursementStatus === "REJECTED"
    );

    return apiResponse.success({
      summary: {
        pendingApproval: {
          count: totalPendingApproval?._count || 0,
          amount: totalPendingApproval?._sum.netPaid
            ? Number(totalPendingApproval._sum.netPaid)
            : 0,
        },
        flagged: {
          count: totalFlagged?._count || 0,
          amount: totalFlagged?._sum.netPaid
            ? Number(totalFlagged._sum.netPaid)
            : 0,
        },
        pendingPayment: {
          count: totalApproved?._count || 0,
          amount: totalApproved?._sum.netPaid
            ? Number(totalApproved._sum.netPaid)
            : 0,
        },
        paid: {
          count: totalPaid?._count || 0,
          amount: totalPaid?._sum.netPaid ? Number(totalPaid._sum.netPaid) : 0,
        },
        rejected: {
          count: totalRejected?._count || 0,
          amount: totalRejected?._sum.netPaid
            ? Number(totalRejected._sum.netPaid)
            : 0,
        },
      },
      pendingPayouts: pendingPayouts.sort((a, b) => b.totalAmount - a.totalAmount),
      pendingPaymentsList,
      _deprecated: {
        warning: "This endpoint is deprecated. Please use /api/reimbursement-requests/summary",
        migrationGuide: "See REIMBURSEMENT_CONSOLIDATION_PLAN.md"
      }
    });
  },
  { permission: "reimbursements:read" }
);
