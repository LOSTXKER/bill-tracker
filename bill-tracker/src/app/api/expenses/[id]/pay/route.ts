import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { hasPermission } from "@/lib/permissions/checker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expenses/[id]/pay
 * บันทึกการจ่ายเงินคืนพนักงาน (สำหรับบัญชี)
 * 
 * Required permissions:
 * - reimbursements:pay
 * - OR expenses:update (fallback)
 * - OR isOwner
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;
    const body = await req.json();
    const { paymentRef, paymentMethod } = body;

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

    // Check if status is APPROVED
    if (expense.reimbursementStatus !== "APPROVED") {
      return apiResponse.badRequest("Can only pay APPROVED reimbursements");
    }

    // Check permission using permission system
    const canPayReimbursement = await hasPermission(
      session.user.id,
      expense.companyId,
      "reimbursements:pay"
    );
    const canUpdateExpense = await hasPermission(
      session.user.id,
      expense.companyId,
      "expenses:update"
    );

    if (!canPayReimbursement && !canUpdateExpense) {
      return apiResponse.forbidden("คุณไม่มีสิทธิ์ในการจ่ายเงินคืน");
    }

    // Update the expense - mark as PAID and convert to normal expense flow
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        reimbursementStatus: "PAID",
        reimbursementPaidAt: new Date(),
        reimbursementPaidBy: session.user.id,
        reimbursementPaymentRef: paymentRef || null,
        // Update payment method if provided
        ...(paymentMethod && { paymentMethod }),
        // Move to normal expense flow - ready for accounting
        status: "PENDING_PHYSICAL",
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        categoryRef: true,
        contact: true,
        reimbursementApprover: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: expense.companyId,
      action: "STATUS_CHANGE",
      entityType: "Expense",
      entityId: id,
      description: `จ่ายเงินคืนเบิกจ่าย: ${expense.description || "ไม่ระบุ"} จำนวน ${expense.netPaid} บาท${paymentRef ? ` (Ref: ${paymentRef})` : ""}`,
      changes: {
        before: { reimbursementStatus: "APPROVED" },
        after: { reimbursementStatus: "PAID", paymentRef },
      },
    });

    return apiResponse.success(
      { expense: updatedExpense },
      "Payment recorded successfully"
    );
  })(request);
}
