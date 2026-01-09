import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { hasPermission } from "@/lib/permissions/checker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reimbursement-requests/[id]/approve
 * อนุมัติคำขอเบิกจ่าย
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;

    // Find the request
    const reimbursementRequest = await prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        company: true,
      },
    });

    if (!reimbursementRequest) {
      return apiResponse.notFound("Reimbursement request not found");
    }

    // Check if status is PENDING or FLAGGED
    if (
      reimbursementRequest.status !== "PENDING" &&
      reimbursementRequest.status !== "FLAGGED"
    ) {
      return apiResponse.badRequest(
        "สามารถอนุมัติได้เฉพาะคำขอที่รออนุมัติ หรือ AI พบปัญหา"
      );
    }

    // Check permission
    const canApprove = await hasPermission(
      session.user.id,
      reimbursementRequest.companyId,
      "reimbursements:approve"
    );

    if (!canApprove) {
      return apiResponse.forbidden("คุณไม่มีสิทธิ์อนุมัติคำขอเบิกจ่าย");
    }

    // Cannot approve own request
    if (reimbursementRequest.requesterId === session.user.id) {
      return apiResponse.badRequest("ไม่สามารถอนุมัติคำขอของตัวเองได้");
    }

    // Update the request
    const updatedRequest = await prisma.reimbursementRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true },
        },
        categoryRef: true,
        contact: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: reimbursementRequest.companyId,
      action: "APPROVE",
      entityType: "ReimbursementRequest",
      entityId: id,
      description: `อนุมัติคำขอเบิกจ่าย: ${reimbursementRequest.description || "ไม่ระบุ"} จำนวน ${reimbursementRequest.netAmount} บาท`,
      changes: {
        before: { status: reimbursementRequest.status },
        after: { status: "APPROVED" },
      },
    });

    return apiResponse.success(
      { request: updatedRequest },
      "อนุมัติสำเร็จ"
    );
  })(request);
}
