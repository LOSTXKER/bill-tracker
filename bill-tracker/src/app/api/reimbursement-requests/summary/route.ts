import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/reimbursement-requests/summary?company=ABC
 * สรุปยอดเบิกจ่ายตามสถานะ
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    // Get summary by status
    const [pending, flagged, approved, rejected, paid] = await Promise.all([
      prisma.reimbursementRequest.aggregate({
        where: { companyId: company.id, status: "PENDING" },
        _count: true,
        _sum: { netAmount: true },
      }),
      prisma.reimbursementRequest.aggregate({
        where: { companyId: company.id, status: "FLAGGED" },
        _count: true,
        _sum: { netAmount: true },
      }),
      prisma.reimbursementRequest.aggregate({
        where: { companyId: company.id, status: "APPROVED" },
        _count: true,
        _sum: { netAmount: true },
      }),
      prisma.reimbursementRequest.aggregate({
        where: { companyId: company.id, status: "REJECTED" },
        _count: true,
        _sum: { netAmount: true },
      }),
      prisma.reimbursementRequest.aggregate({
        where: { companyId: company.id, status: "PAID" },
        _count: true,
        _sum: { netAmount: true },
      }),
    ]);

    // Get pending payouts grouped by requester name (anonymous system)
    const pendingPayouts = await prisma.reimbursementRequest.groupBy({
      by: ["requesterName"],
      where: { companyId: company.id, status: "APPROVED" },
      _sum: { netAmount: true },
      _count: true,
    });

    const payoutsByRequester = pendingPayouts.map((p) => ({
      requesterName: p.requesterName,
      count: p._count,
      amount: p._sum.netAmount?.toNumber() || 0,
    }));

    return apiResponse.success({
      summary: {
        pendingApproval: {
          count: pending._count,
          amount: pending._sum.netAmount?.toNumber() || 0,
        },
        flagged: {
          count: flagged._count,
          amount: flagged._sum.netAmount?.toNumber() || 0,
        },
        pendingPayment: {
          count: approved._count,
          amount: approved._sum.netAmount?.toNumber() || 0,
        },
        rejected: {
          count: rejected._count,
          amount: rejected._sum.netAmount?.toNumber() || 0,
        },
        paid: {
          count: paid._count,
          amount: paid._sum.netAmount?.toNumber() || 0,
        },
      },
      payoutsByRequester,
    });
  },
  { permission: "reimbursements:read" }
);
