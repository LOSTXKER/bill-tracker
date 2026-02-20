import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { randomUUID } from "crypto";

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

    // Update all payments
    const updatedPayments = await prisma.expensePayment.updateMany({
      where: {
        id: { in: pendingPayments.map((p) => p.id) },
      },
      data: {
        settlementStatus: "SETTLED",
        settledAt,
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

    // Get payer names for audit log
    const payerNames = [...new Set(
      pendingPayments.map((p) => p.PaidByUser?.name || p.paidByName || "ไม่ระบุ")
    )];

    // Create expense record if requested
    let createdExpenseId: string | null = null;
    if (createExpense && expensePayerType) {
      // Group payments by employee to potentially create multiple expenses
      const paymentsByEmployee: Record<string, typeof pendingPayments> = {};
      
      pendingPayments.forEach((p) => {
        const employeeId = p.paidByUserId || "unknown";
        if (!paymentsByEmployee[employeeId]) {
          paymentsByEmployee[employeeId] = [];
        }
        paymentsByEmployee[employeeId].push(p);
      });

      // Create one expense per employee
      for (const [employeeId, employeePayments] of Object.entries(paymentsByEmployee)) {
        const employeeName = employeePayments[0].PaidByUser?.name || "พนักงาน";
        const employeeAmount = employeePayments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        const expenseId = randomUUID();
        createdExpenseId = expenseId;

        // Create the expense
        await prisma.expense.create({
          data: {
            id: expenseId,
            companyId: company.id,
            amount: employeeAmount,
            vatRate: 0,
            vatAmount: 0,
            netPaid: employeeAmount,
            description: `โอนคืนค่าใช้จ่ายให้${employeeName} (${employeePayments.length} รายการ)`,
            billDate: settledAt,
            paymentMethod: "BANK_TRANSFER",
            workflowStatus: "COMPLETED",
            status: "PENDING_PHYSICAL",
            createdBy: session.user.id,
            updatedAt: new Date(),
            // Store the employee name as contact
            contactName: employeeName,
            // Attach settlement slips as receipts
            slipUrls: settlementSlipUrls || [],
            // Add settlement reference to notes
            notes: settlementRef ? `เลขอ้างอิงการโอน: ${settlementRef}` : undefined,
          },
        });

        // Create ExpensePayment record for the new expense
        await prisma.expensePayment.create({
          data: {
            expenseId,
            amount: employeeAmount,
            paidByType: expensePayerType,
            paidByUserId: expensePayerType === "USER" ? expensePayerId : null,
            settlementStatus: "NOT_REQUIRED", // Company/User paid, no need to reimburse
          },
        });

        // Audit log for expense creation
        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "CREATE",
          entityType: "Expense",
          entityId: expenseId,
          description: `สร้างรายจ่าย "โอนคืนค่าใช้จ่ายให้${employeeName}" ฿${employeeAmount.toLocaleString()}`,
          changes: {
            fromSettlement: true,
            paymentIds: employeePayments.map((p) => p.id),
          },
        });
      }
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
