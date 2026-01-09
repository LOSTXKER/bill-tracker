import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { hasPermission } from "@/lib/permissions/checker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reimbursement-requests/[id]/reject
 * ปฏิเสธคำขอเบิกจ่าย
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim() === "") {
      return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
    }

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
        "สามารถปฏิเสธได้เฉพาะคำขอที่รออนุมัติ หรือ AI พบปัญหา"
      );
    }

    // Check permission
    const canReject = await hasPermission(
      session.user.id,
      reimbursementRequest.companyId,
      "reimbursements:approve"
    );

    if (!canReject) {
      return apiResponse.forbidden("คุณไม่มีสิทธิ์ปฏิเสธคำขอเบิกจ่าย");
    }

    // Update the request
    const updatedRequest = await prisma.reimbursementRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectedReason: reason.trim(),
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
      action: "STATUS_CHANGE",
      entityType: "ReimbursementRequest",
      entityId: id,
      description: `ปฏิเสธคำขอเบิกจ่าย: ${reimbursementRequest.description || "ไม่ระบุ"} เหตุผล: ${reason}`,
      changes: {
        before: { status: reimbursementRequest.status },
        after: { status: "REJECTED", reason },
      },
    });

    return apiResponse.success(
      { request: updatedRequest },
      "ปฏิเสธสำเร็จ"
    );
  })(request);
}
