import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/checker";
import { createAuditLog } from "@/lib/audit/logger";
import type { PaidByType, SettlementStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/expenses/[id]/payments
 * Get all payments for an expense
 */
export const GET = withAuth<RouteParams>(async (req, { session }, routeContext) => {
  try {
    const { id: expenseId } = await routeContext!.params;

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

    // Get payments
    const payments = await prisma.expensePayment.findMany({
      where: { expenseId },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return apiResponse.success({ payments });
  } catch (error) {
    console.error("Error fetching expense payments:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
  }
});

interface PaymentInput {
  paidByType: PaidByType;
  paidByUserId?: string | null;
  paidByName?: string | null;
  paidByBankName?: string | null;
  paidByBankAccount?: string | null;
  amount: number;
}

/**
 * POST /api/expenses/[id]/payments
 * Add payment(s) to an expense
 */
export const POST = withAuth<RouteParams>(async (req, { session }, routeContext) => {
  try {
    const { id: expenseId } = await routeContext!.params;
    const body = await req.json();
    const { payments } = body as { payments: PaymentInput[] };

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return apiResponse.badRequest("กรุณาระบุข้อมูลผู้จ่าย");
    }

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, companyId: true, netPaid: true, description: true },
    });

    if (!expense) {
      return apiResponse.notFound("ไม่พบรายจ่าย");
    }

    // Check permission
    const canUpdate = await hasPermission(session.user.id, expense.companyId, "expenses:update");
    if (!canUpdate) {
      return apiResponse.forbidden("ไม่มีสิทธิ์แก้ไขรายจ่าย");
    }

    // Create payments
    const createdPayments = await Promise.all(
      payments.map(async (payment) => {
        // Determine settlement status based on payer type
        // Only USER type requires settlement
        let settlementStatus: SettlementStatus = "NOT_REQUIRED";
        if (payment.paidByType === "USER") {
          settlementStatus = "PENDING";
        }

        return prisma.expensePayment.create({
          data: {
            expenseId,
            paidByType: payment.paidByType,
            paidByUserId: payment.paidByUserId || null,
            paidByName: payment.paidByName || null,
            paidByBankName: payment.paidByBankName || null,
            paidByBankAccount: payment.paidByBankAccount || null,
            amount: payment.amount,
            settlementStatus,
          },
          include: {
            PaidByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        });
      })
    );

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: expense.companyId,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expenseId,
      description: `เพิ่มผู้จ่ายเงิน ${createdPayments.length} รายการ สำหรับ: ${expense.description || "ไม่ระบุ"}`,
      changes: {
        paymentsAdded: createdPayments.map((p) => ({
          id: p.id,
          type: p.paidByType,
          amount: p.amount.toString(),
        })),
      },
    });

    return apiResponse.success({ payments: createdPayments }, "เพิ่มผู้จ่ายเงินสำเร็จ");
  } catch (error) {
    console.error("Error creating expense payments:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการเพิ่มผู้จ่ายเงิน");
  }
});

/**
 * DELETE /api/expenses/[id]/payments
 * Delete payment(s) from an expense
 * Query param: ?paymentId=xxx or body: { paymentIds: [...] }
 */
export const DELETE = withAuth<RouteParams>(async (req, { session }, routeContext) => {
  try {
    const { id: expenseId } = await routeContext!.params;
    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId");

    let paymentIds: string[] = [];
    if (paymentId) {
      paymentIds = [paymentId];
    } else {
      const body = await req.json();
      paymentIds = body.paymentIds || [];
    }

    if (paymentIds.length === 0) {
      return apiResponse.badRequest("กรุณาระบุ ID ของผู้จ่ายที่ต้องการลบ");
    }

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

    // Check if any payment is already settled
    const payments = await prisma.expensePayment.findMany({
      where: {
        id: { in: paymentIds },
        expenseId,
      },
    });

    const settledPayments = payments.filter((p) => p.settlementStatus === "SETTLED");
    if (settledPayments.length > 0) {
      return apiResponse.badRequest("ไม่สามารถลบผู้จ่ายที่โอนคืนแล้วได้");
    }

    // Delete payments
    await prisma.expensePayment.deleteMany({
      where: {
        id: { in: paymentIds },
        expenseId,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: expense.companyId,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expenseId,
      description: `ลบผู้จ่ายเงิน ${paymentIds.length} รายการ สำหรับ: ${expense.description || "ไม่ระบุ"}`,
      changes: {
        paymentsRemoved: paymentIds,
      },
    });

    return apiResponse.success({ deletedIds: paymentIds }, "ลบผู้จ่ายเงินสำเร็จ");
  } catch (error) {
    console.error("Error deleting expense payments:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการลบผู้จ่ายเงิน");
  }
});
