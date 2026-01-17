import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/checker";
import { createAuditLog } from "@/lib/audit/logger";
import type { PaidByType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; paymentId: string }>;
}

/**
 * GET /api/expenses/[id]/payments/[paymentId]
 * Get a specific payment
 */
export const GET = withAuth<RouteParams>(async (req, { session }, routeContext) => {
  try {
    const { id: expenseId, paymentId } = await routeContext!.params;

    // Find the expense first
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, companyId: true },
    });

    if (!expense) {
      return apiResponse.notFound("ไม่พบรายจ่าย");
    }

    // Check permission
    const canRead = await hasPermission(session.user.id, expense.companyId, "expenses:read");
    if (!canRead) {
      return apiResponse.forbidden("ไม่มีสิทธิ์ดูรายจ่าย");
    }

    // Get payment
    const payment = await prisma.expensePayment.findUnique({
      where: { id: paymentId },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
      },
    });

    if (!payment || payment.expenseId !== expenseId) {
      return apiResponse.notFound("ไม่พบข้อมูลผู้จ่าย");
    }

    return apiResponse.success({ payment });
  } catch (error) {
    console.error("Error fetching expense payment:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
  }
});

interface PaymentUpdateInput {
  paidByType?: PaidByType;
  paidByUserId?: string | null;
  paidByName?: string | null;
  paidByBankName?: string | null;
  paidByBankAccount?: string | null;
  amount?: number;
}

/**
 * PUT /api/expenses/[id]/payments/[paymentId]
 * Update a specific payment
 */
export const PUT = withAuth<RouteParams>(async (req, { session }, routeContext) => {
  try {
    const { id: expenseId, paymentId } = await routeContext!.params;
    const body = (await req.json()) as PaymentUpdateInput;

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, companyId: true, description: true },
    });

    if (!expense) {
      return apiResponse.notFound("ไม่พบรายจ่าย");
    }

    // Check permission
    const canUpdate = await hasPermission(session.user.id, expense.companyId, "expenses:update");
    if (!canUpdate) {
      return apiResponse.forbidden("ไม่มีสิทธิ์แก้ไขรายจ่าย");
    }

    // Find existing payment
    const existingPayment = await prisma.expensePayment.findUnique({
      where: { id: paymentId },
    });

    if (!existingPayment || existingPayment.expenseId !== expenseId) {
      return apiResponse.notFound("ไม่พบข้อมูลผู้จ่าย");
    }

    // Can't update settled payments (except by settlements:manage permission)
    if (existingPayment.settlementStatus === "SETTLED") {
      return apiResponse.badRequest("ไม่สามารถแก้ไขผู้จ่ายที่โอนคืนแล้วได้");
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.paidByType !== undefined) updateData.paidByType = body.paidByType;
    if (body.paidByUserId !== undefined) updateData.paidByUserId = body.paidByUserId;
    if (body.paidByName !== undefined) updateData.paidByName = body.paidByName;
    if (body.paidByBankName !== undefined) updateData.paidByBankName = body.paidByBankName;
    if (body.paidByBankAccount !== undefined) updateData.paidByBankAccount = body.paidByBankAccount;
    if (body.amount !== undefined) updateData.amount = body.amount;

    // Update settlement status if payer type changed
    // Only USER type requires settlement
    if (body.paidByType) {
      if (body.paidByType === "USER") {
        updateData.settlementStatus = "PENDING";
      } else {
        updateData.settlementStatus = "NOT_REQUIRED";
      }
    }

    // Update payment
    const updatedPayment = await prisma.expensePayment.update({
      where: { id: paymentId },
      data: updateData,
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
    await createAuditLog({
      userId: session.user.id,
      companyId: expense.companyId,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expenseId,
      description: `แก้ไขข้อมูลผู้จ่ายเงิน สำหรับ: ${expense.description || "ไม่ระบุ"}`,
      changes: {
        paymentId,
        before: existingPayment,
        after: updateData,
      },
    });

    return apiResponse.success({ payment: updatedPayment }, "แก้ไขข้อมูลผู้จ่ายสำเร็จ");
  } catch (error) {
    console.error("Error updating expense payment:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
  }
});

/**
 * DELETE /api/expenses/[id]/payments/[paymentId]
 * Delete a specific payment
 */
export const DELETE = withAuth<RouteParams>(async (req, { session }, routeContext) => {
  try {
    const { id: expenseId, paymentId } = await routeContext!.params;

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, companyId: true, description: true },
    });

    if (!expense) {
      return apiResponse.notFound("ไม่พบรายจ่าย");
    }

    // Check permission
    const canUpdate = await hasPermission(session.user.id, expense.companyId, "expenses:update");
    if (!canUpdate) {
      return apiResponse.forbidden("ไม่มีสิทธิ์แก้ไขรายจ่าย");
    }

    // Find existing payment
    const existingPayment = await prisma.expensePayment.findUnique({
      where: { id: paymentId },
    });

    if (!existingPayment || existingPayment.expenseId !== expenseId) {
      return apiResponse.notFound("ไม่พบข้อมูลผู้จ่าย");
    }

    // Can't delete settled payments
    if (existingPayment.settlementStatus === "SETTLED") {
      return apiResponse.badRequest("ไม่สามารถลบผู้จ่ายที่โอนคืนแล้วได้");
    }

    // Delete payment
    await prisma.expensePayment.delete({
      where: { id: paymentId },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: expense.companyId,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expenseId,
      description: `ลบผู้จ่ายเงิน สำหรับ: ${expense.description || "ไม่ระบุ"}`,
      changes: {
        paymentRemoved: existingPayment,
      },
    });

    return apiResponse.success({ deletedId: paymentId }, "ลบผู้จ่ายเงินสำเร็จ");
  } catch (error) {
    console.error("Error deleting expense payment:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการลบ");
  }
});
