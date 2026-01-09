import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { hasPermission } from "@/lib/permissions/checker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expenses/[id]/reject
 * ปฏิเสธคำขอเบิกจ่าย (สำหรับ Manager/Admin)
 * 
 * Required permissions:
 * - reimbursements:approve (สำหรับเบิกจ่าย)
 * - OR expenses:approve (fallback)
 * - OR isOwner
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim() === "") {
      return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
    }

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        company: true,
        requester: true,
      },
    });

    if (!expense) {
      return apiResponse.notFound("Expense not found");
    }

    // Check if it's a reimbursement
    if (!expense.isReimbursement) {
      return apiResponse.badRequest("This expense is not a reimbursement request");
    }

    // Check if status is PENDING or FLAGGED
    if (
      expense.reimbursementStatus !== "PENDING" &&
      expense.reimbursementStatus !== "FLAGGED"
    ) {
      return apiResponse.badRequest("Can only reject PENDING or FLAGGED reimbursements");
    }

    // Check permission using permission system
    const canApproveReimbursement = await hasPermission(
      session.user.id,
      expense.companyId,
      "reimbursements:approve"
    );
    const canApproveExpense = await hasPermission(
      session.user.id,
      expense.companyId,
      "expenses:approve"
    );

    if (!canApproveReimbursement && !canApproveExpense) {
      return apiResponse.forbidden("คุณไม่มีสิทธิ์ในการปฏิเสธคำขอเบิกจ่าย");
    }

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        reimbursementStatus: "REJECTED",
        reimbursementApprovedBy: session.user.id,
        reimbursementApprovedAt: new Date(),
        reimbursementRejectedReason: reason.trim(),
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        categoryRef: true,
        contact: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: expense.companyId,
      action: "STATUS_CHANGE",
      entityType: "Expense",
      entityId: id,
      description: `ปฏิเสธเบิกจ่าย: ${expense.description || "ไม่ระบุ"} เหตุผล: ${reason}`,
      changes: {
        before: { reimbursementStatus: expense.reimbursementStatus },
        after: { reimbursementStatus: "REJECTED", reason },
      },
    });

    return apiResponse.success(
      { expense: updatedExpense },
      "Reimbursement rejected"
    );
  })(request);
}
