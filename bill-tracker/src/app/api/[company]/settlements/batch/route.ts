import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { randomUUID } from "crypto";
import { generateDocumentCode } from "@/lib/utils/document-code";

interface RouteParams {
  params: Promise<{ company: string }>;
}

/**
 * POST /api/[company]/settlements/batch
 * Mark multiple payments as settled and create expense record
 */
export const POST = withCompanyAccessFromParams(
  async (request, { session, company }) => {
    const body = await request.json();
    const { 
      paymentIds, 
      settlementRef, 
      settlementSlipUrls,
      // New fields for auto expense creation
      createExpense = false,
      expensePayerType, // "USER" or "COMPANY"
      expensePayerId,   // User ID if payerType is USER
    } = body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return apiResponse.badRequest("กรุณาระบุรายการที่ต้องการโอนคืน");
    }

    // Find all payments (only for approved / not-required expenses)
    const payments = await prisma.expensePayment.findMany({
      where: {
        id: { in: paymentIds },
        Expense: {
          companyId: company.id,
          deletedAt: null,
          approvalStatus: { in: ["APPROVED", "NOT_REQUIRED"] },
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

    const settledAt = new Date();

    // Calculate totals before transaction (read-only, safe outside)
    const totalAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const payerNames = [...new Set(
      pendingPayments.map((p) => p.PaidByUser?.name || p.paidByName || "ไม่ระบุ")
    )];

    // Group by employee for optional expense creation
    const paymentsByEmployee: Record<string, typeof pendingPayments> = {};
    if (createExpense && expensePayerType) {
      pendingPayments.forEach((p) => {
        const key = p.paidByUserId || "unknown";
        if (!paymentsByEmployee[key]) paymentsByEmployee[key] = [];
        paymentsByEmployee[key].push(p);
      });
    }

    // Pre-generate expense IDs so we can reference them in audit logs after the transaction
    const expenseIdsForEmployees: Array<{ employeeId: string; expenseId: string; employeeName: string; amount: number; paymentIds: string[] }> = [];
    if (createExpense && expensePayerType) {
      for (const [employeeId, employeePayments] of Object.entries(paymentsByEmployee)) {
        expenseIdsForEmployees.push({
          employeeId,
          expenseId: randomUUID(),
          employeeName: employeePayments[0].PaidByUser?.name || "พนักงาน",
          amount: employeePayments.reduce((sum, p) => sum + Number(p.amount), 0),
          paymentIds: employeePayments.map((p) => p.id),
        });
      }
    }

    // Atomic: mark payments settled + optionally create expense records
    const updatedPayments = await prisma.$transaction(async (tx) => {
      // Mark all payments settled — add settlementStatus: "PENDING" to the DB where to prevent TOCTOU
      const updated = await tx.expensePayment.updateMany({
        where: {
          id: { in: pendingPayments.map((p) => p.id) },
          settlementStatus: "PENDING",
        },
        data: {
          settlementStatus: "SETTLED",
          settledAt,
          settledBy: session.user.id,
          settlementRef: settlementRef || null,
          settlementSlipUrls: settlementSlipUrls || [],
        },
      });

      // If concurrent request already settled some, abort to avoid partial state
      if (updated.count !== pendingPayments.length) {
        throw new Error(`CONCURRENT_SETTLE: expected ${pendingPayments.length} but updated ${updated.count}`);
      }

      // Create one expense + payment per employee (if requested)
      for (const entry of expenseIdsForEmployees) {
        const documentCode = await generateDocumentCode(
          tx,
          company.id,
          "expense",
          settledAt,
        );
        await tx.expense.create({
          data: {
            id: entry.expenseId,
            companyId: company.id,
            documentCode,
            amount: entry.amount,
            vatRate: 0,
            vatAmount: 0,
            netPaid: entry.amount,
            description: `โอนคืนค่าใช้จ่ายให้${entry.employeeName} (${entry.paymentIds.length} รายการ)`,
            billDate: settledAt,
            paymentMethod: "BANK_TRANSFER",
            workflowStatus: "COMPLETED",
            status: "PENDING_PHYSICAL",
            isSettlementTransfer: true,
            createdBy: session.user.id,
            updatedAt: new Date(),
            contactName: entry.employeeName,
            slipUrls: settlementSlipUrls || [],
            notes: settlementRef ? `เลขอ้างอิงการโอน: ${settlementRef}` : undefined,
          },
        });

        await tx.expensePayment.create({
          data: {
            expenseId: entry.expenseId,
            amount: entry.amount,
            paidByType: expensePayerType,
            paidByUserId: expensePayerType === "USER" ? expensePayerId : null,
            settlementStatus: "NOT_REQUIRED",
          },
        });
      }

      return updated;
    });

    // Audit logs (outside transaction — non-critical, best-effort)
    let createdExpenseId: string | null = expenseIdsForEmployees[0]?.expenseId ?? null;
    for (const entry of expenseIdsForEmployees) {
      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "CREATE",
        entityType: "Expense",
        entityId: entry.expenseId,
        description: `สร้างรายจ่าย "โอนคืนค่าใช้จ่ายให้${entry.employeeName}" ฿${entry.amount.toLocaleString()}`,
        changes: { fromSettlement: true, paymentIds: entry.paymentIds },
      });
    }
    
    // Create audit log for settlement
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
        settledAt: settledAt.toISOString(),
        createdExpenseId,
      },
    });

    return apiResponse.success(
      {
        settledCount: updatedPayments.count,
        totalAmount,
        paymentIds: pendingPayments.map((p) => p.id),
        createdExpenseId,
      },
      `โอนคืนสำเร็จ ${updatedPayments.count} รายการ`
    );
  },
  { permission: "settlements:manage" }
);
