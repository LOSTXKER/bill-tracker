import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { hasPermission } from "@/lib/permissions/checker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reimbursement-requests/[id]/pay
 * บันทึกการจ่ายเงินคืน (ไม่สร้าง Expense อัตโนมัติ - ต้องกดสร้างเอง)
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;
    const body = await req.json();
    const { paymentRef } = body;

    // Find the request
    const reimbursementRequest = await prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        company: true,
        contact: true,
      },
    });

    if (!reimbursementRequest) {
      return apiResponse.notFound("Reimbursement request not found");
    }

    // Check if status is APPROVED
    if (reimbursementRequest.status !== "APPROVED") {
      return apiResponse.badRequest(
        "สามารถจ่ายเงินได้เฉพาะคำขอที่อนุมัติแล้วเท่านั้น"
      );
    }

    // Check permission
    const canPay = await hasPermission(
      session.user.id,
      reimbursementRequest.companyId,
      "reimbursements:pay"
    );

    if (!canPay) {
      return apiResponse.forbidden("คุณไม่มีสิทธิ์บันทึกการจ่ายเงิน");
    }

    // Update reimbursement request status to PAID
    // Note: Expense is NOT created automatically - user must click "สร้างรายจ่าย" button
    const updatedRequest = await prisma.reimbursementRequest.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidBy: session.user.id,
        paymentRef: paymentRef || null,
      },
      include: {
        approver: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true },
        },
        contact: true,
        linkedExpense: {
          select: { id: true, status: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: reimbursementRequest.companyId,
      action: "STATUS_CHANGE",
      entityType: "ReimbursementRequest",
      entityId: id,
      description: `จ่ายเงินเบิกจ่าย: ${reimbursementRequest.description || "ไม่ระบุ"} จำนวน ${reimbursementRequest.netAmount} บาท`,
      changes: {
        before: { status: "APPROVED" },
        after: { status: "PAID", paymentRef },
      },
    });

    return apiResponse.success(
      { request: updatedRequest },
      "บันทึกการจ่ายเงินสำเร็จ"
    );
  })(request);
}
