import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

interface RouteParams {
  params: Promise<{ company: string }>;
}

/**
 * POST /api/[company]/settlements/batch
 * Mark multiple payments as settled
 */
export const POST = withCompanyAccessFromParams(
  async (request, { session, company }) => {
    const body = await request.json();
    const { paymentIds, settlementRef, settlementSlipUrls } = body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return apiResponse.badRequest("กรุณาระบุรายการที่ต้องการโอนคืน");
    }

    // Find all payments
    const payments = await prisma.expensePayment.findMany({
      where: {
        id: { in: paymentIds },
        Expense: {
          companyId: company.id,
          deletedAt: null,
        },
      },
      include: {
        Expense: {
          select: { id: true, description: true },
        },
        PaidByUser: {
          select: { id: true, name: true },
        },
      },
    });

    if (payments.length === 0) {
      return apiResponse.notFound("ไม่พบรายการที่ต้องการโอนคืน");
    }

    // Filter only pending payments
    const pendingPayments = payments.filter(
      (p) => p.settlementStatus === "PENDING"
    );

    if (pendingPayments.length === 0) {
      return apiResponse.badRequest("ไม่มีรายการที่รอโอนคืน");
    }

    // Update all payments
    const updatedPayments = await prisma.expensePayment.updateMany({
      where: {
        id: { in: pendingPayments.map((p) => p.id) },
      },
      data: {
        settlementStatus: "SETTLED",
        settledAt: new Date(),
        settledBy: session.user.id,
        settlementRef: settlementRef || null,
        settlementSlipUrls: settlementSlipUrls || [],
      },
    });

    // Calculate total amount
    const totalAmount = pendingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    // Create audit log
    const payerNames = [...new Set(
      pendingPayments.map((p) => p.PaidByUser?.name || p.paidByName || "ไม่ระบุ")
    )];
    
    await createAuditLog({
      userId: session.user.id,
      companyId: company.id,
      action: "UPDATE",
      entityType: "ExpensePayment",
      entityId: pendingPayments[0].id,
      description: `โอนคืนเงิน ${pendingPayments.length} รายการ รวม ฿${totalAmount.toLocaleString()} ให้ ${payerNames.join(", ")}`,
      changes: {
        paymentIds: pendingPayments.map((p) => p.id),
        totalAmount,
        settlementRef,
        settledAt: new Date().toISOString(),
      },
    });

    return apiResponse.success(
      {
        settledCount: updatedPayments.count,
        totalAmount,
        paymentIds: pendingPayments.map((p) => p.id),
      },
      `โอนคืนสำเร็จ ${updatedPayments.count} รายการ`
    );
  },
  { permission: "settlements:manage" }
);
