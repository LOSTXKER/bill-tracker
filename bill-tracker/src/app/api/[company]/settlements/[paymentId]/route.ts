import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

interface RouteParams {
  params: Promise<{ company: string; paymentId: string }>;
}

/**
 * GET /api/[company]/settlements/[paymentId]
 * Get a specific payment
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company, params }) => {
    const payment = await prisma.expensePayment.findUnique({
      where: { id: params.paymentId },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
        Expense: {
          select: {
            id: true,
            companyId: true,
            description: true,
            billDate: true,
            netPaid: true,
            invoiceNumber: true,
            Contact: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!payment) {
      return apiResponse.notFound("ไม่พบข้อมูลการจ่ายเงิน");
    }

    // Check company access
    if (payment.Expense.companyId !== company.id) {
      return apiResponse.forbidden("ไม่มีสิทธิ์ดูข้อมูลนี้");
    }

    return apiResponse.success({ payment });
  },
  { permission: "settlements:read" }
);

/**
 * POST /api/[company]/settlements/[paymentId]
 * Mark payment as settled
 */
export const POST = withCompanyAccessFromParams(
  async (request, { session, company, params }) => {
    const body = await request.json();
    const { settlementRef, settlementSlipUrls } = body;

    // Find the payment
    const payment = await prisma.expensePayment.findUnique({
      where: { id: params.paymentId },
      include: {
        Expense: {
          select: { id: true, companyId: true, description: true, approvalStatus: true },
        },
        PaidByUser: {
          select: { id: true, name: true },
        },
      },
    });

    if (!payment) {
      return apiResponse.notFound("ไม่พบข้อมูลการจ่ายเงิน");
    }

    // Check company access
    if (payment.Expense.companyId !== company.id) {
      return apiResponse.forbidden("ไม่มีสิทธิ์แก้ไขข้อมูลนี้");
    }

    // Prevent settling payments for unapproved expenses
    const approvalStatus = payment.Expense.approvalStatus;
    if (approvalStatus === "PENDING" || approvalStatus === "REJECTED") {
      return apiResponse.badRequest("ไม่สามารถโอนคืนได้ เนื่องจากรายจ่ายยังไม่ได้รับอนุมัติ");
    }

    // Check if already settled
    if (payment.settlementStatus === "SETTLED") {
      return apiResponse.badRequest("รายการนี้โอนคืนแล้ว");
    }

    // Check if settlement is required
    if (payment.settlementStatus === "NOT_REQUIRED") {
      return apiResponse.badRequest("รายการนี้ไม่ต้องโอนคืน");
    }

    // Update payment
    const updatedPayment = await prisma.expensePayment.update({
      where: { id: params.paymentId },
      data: {
        settlementStatus: "SETTLED",
        settledAt: new Date(),
        settledBy: session.user.id,
        settlementRef: settlementRef || null,
        settlementSlipUrls: settlementSlipUrls || [],
      },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    const payerName = payment.PaidByUser?.name || payment.paidByName || "ไม่ระบุ";
    await createAuditLog({
      userId: session.user.id,
      companyId: company.id,
      action: "UPDATE",
      entityType: "ExpensePayment",
      entityId: params.paymentId,
      description: `โอนคืนเงิน ฿${Number(payment.amount).toLocaleString()} ให้ ${payerName} สำหรับ: ${payment.Expense.description || "ไม่ระบุ"}`,
      changes: {
        before: { settlementStatus: payment.settlementStatus },
        after: {
          settlementStatus: "SETTLED",
          settlementRef,
          settledAt: new Date().toISOString(),
        },
      },
    });

    return apiResponse.success(
      { payment: updatedPayment },
      "บันทึกการโอนคืนสำเร็จ"
    );
  },
  { permission: "settlements:manage" }
);

/**
 * PATCH /api/[company]/settlements/[paymentId]
 * Reverse a settled payment (ยกเลิกการโอนคืน)
 */
export const PATCH = withCompanyAccessFromParams(
  async (request, { session, company, params }) => {
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return apiResponse.badRequest("กรุณาระบุเหตุผลในการยกเลิก");
    }

    // Find the payment
    const payment = await prisma.expensePayment.findUnique({
      where: { id: params.paymentId },
      include: {
        Expense: {
          select: { id: true, companyId: true, description: true, deletedAt: true },
        },
        PaidByUser: {
          select: { id: true, name: true },
        },
      },
    });

    if (!payment) {
      return apiResponse.notFound("ไม่พบข้อมูลการจ่ายเงิน");
    }

    // Check company access
    if (payment.Expense.companyId !== company.id) {
      return apiResponse.forbidden("ไม่มีสิทธิ์แก้ไขข้อมูลนี้");
    }

    // Check if expense is deleted
    if (payment.Expense.deletedAt) {
      return apiResponse.badRequest("ไม่สามารถยกเลิกการโอนคืนได้ เนื่องจากรายจ่ายถูกลบแล้ว");
    }

    // Check if already SETTLED
    if (payment.settlementStatus !== "SETTLED") {
      return apiResponse.badRequest("สามารถยกเลิกได้เฉพาะรายการที่โอนคืนแล้วเท่านั้น");
    }

    // Update payment to REVERSED, then PENDING (to allow re-settlement)
    const updatedPayment = await prisma.expensePayment.update({
      where: { id: params.paymentId },
      data: {
        settlementStatus: "PENDING", // Back to PENDING so it can be re-settled
        reversedAt: new Date(),
        reversedBy: session.user.id,
        reversalReason: reason.trim(),
        // Keep settlement info for history
        // settledAt, settledBy, settlementRef remain unchanged
      },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
        ReversedByUser: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    const payerName = payment.PaidByUser?.name || payment.paidByName || "ไม่ระบุ";
    await createAuditLog({
      userId: session.user.id,
      companyId: company.id,
      action: "UPDATE",
      entityType: "ExpensePayment",
      entityId: params.paymentId,
      description: `ยกเลิกการโอนคืน ฿${Number(payment.amount).toLocaleString()} ของ ${payerName} เหตุผล: ${reason}`,
      changes: {
        before: { settlementStatus: "SETTLED" },
        after: {
          settlementStatus: "PENDING",
          reversedAt: new Date().toISOString(),
          reversalReason: reason,
        },
      },
    });

    return apiResponse.success(
      { payment: updatedPayment },
      "ยกเลิกการโอนคืนสำเร็จ รายการกลับสู่สถานะรอโอนคืน"
    );
  },
  { permission: "settlements:manage" }
);
