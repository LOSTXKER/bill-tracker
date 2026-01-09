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
 * จ่ายเงินคืนและสร้าง Expense record
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;
    const body = await req.json();
    const { paymentRef, paymentMethod } = body;

    // Find the request
    const reimbursementRequest = await prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        company: true,
        categoryRef: true,
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

    // Use transaction to ensure both operations succeed
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Expense record (NOW the expense is created!)
      const expense = await tx.expense.create({
        data: {
          companyId: reimbursementRequest.companyId,
          contactId: reimbursementRequest.contactId,
          amount: reimbursementRequest.amount,
          vatRate: reimbursementRequest.vatRate,
          vatAmount: reimbursementRequest.vatAmount,
          netPaid: reimbursementRequest.netAmount,
          description: reimbursementRequest.description
            ? `[เบิกจ่าย] ${reimbursementRequest.description}`
            : `[เบิกจ่าย] โดย ${reimbursementRequest.requester?.name || "พนักงาน"}`,
          categoryId: reimbursementRequest.categoryId,
          invoiceNumber: reimbursementRequest.invoiceNumber,
          paymentMethod: paymentMethod || reimbursementRequest.paymentMethod,
          billDate: reimbursementRequest.billDate,
          status: "PENDING_PHYSICAL", // Normal expense flow
          slipUrls: reimbursementRequest.receiptUrls || [],
          taxInvoiceUrls: [],
          whtCertUrls: [],
          createdBy: session.user.id,
          // Mark as reimbursement for reference (but it's now a real expense)
          isReimbursement: true,
          requesterId: reimbursementRequest.requesterId,
          reimbursementStatus: "PAID",
          reimbursementApprovedBy: reimbursementRequest.approvedBy,
          reimbursementApprovedAt: reimbursementRequest.approvedAt,
          reimbursementPaidAt: new Date(),
          reimbursementPaidBy: session.user.id,
          reimbursementPaymentRef: paymentRef || null,
        },
      });

      // 2. Update reimbursement request
      const updatedRequest = await tx.reimbursementRequest.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidBy: session.user.id,
          paymentRef: paymentRef || null,
          linkedExpenseId: expense.id,
        },
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          approver: {
            select: { id: true, name: true },
          },
          payer: {
            select: { id: true, name: true },
          },
          categoryRef: true,
          contact: true,
          linkedExpense: {
            select: { id: true, status: true },
          },
        },
      });

      return { expense, request: updatedRequest };
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: reimbursementRequest.companyId,
      action: "STATUS_CHANGE",
      entityType: "ReimbursementRequest",
      entityId: id,
      description: `จ่ายเงินเบิกจ่าย: ${reimbursementRequest.description || "ไม่ระบุ"} จำนวน ${reimbursementRequest.netAmount} บาท → สร้างรายจ่าย ${result.expense.id}`,
      changes: {
        before: { status: "APPROVED" },
        after: { status: "PAID", expenseId: result.expense.id, paymentRef },
      },
    });

    return apiResponse.success(
      {
        request: result.request,
        expense: result.expense,
      },
      "บันทึกการจ่ายเงินสำเร็จ - รายจ่ายถูกสร้างในระบบ"
    );
  })(request);
}
