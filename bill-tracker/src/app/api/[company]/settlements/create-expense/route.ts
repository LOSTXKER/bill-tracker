import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import type { PaidByType } from "@prisma/client";

/**
 * POST /api/[company]/settlements/create-expense
 * Create an expense record from settled payments (to record the bank transfer out)
 * 
 * Body:
 * - paymentIds: string[] - IDs of settled payments to include
 * - notes?: string - Optional notes for the expense
 * - accountId?: string - Optional account to assign
 */
export const POST = withCompanyAccessFromParams(
  async (request, { company, session }) => {
    const body = await request.json();
    const { paymentIds, notes, accountId } = body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return apiResponse.badRequest("กรุณาเลือกรายการที่ต้องการสร้างรายจ่าย");
    }

    // Get the payments with their details
    const payments = await prisma.expensePayment.findMany({
      where: {
        id: { in: paymentIds },
        settlementStatus: "SETTLED",
        paidByType: "USER" as PaidByType,
        Expense: {
          companyId: company.id,
          deletedAt: null,
        },
      },
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        Expense: {
          select: {
            id: true,
            description: true,
            billDate: true,
          },
        },
      },
    });

    if (payments.length === 0) {
      return apiResponse.notFound("ไม่พบรายการที่เลือก หรือรายการไม่ได้อยู่ในสถานะโอนคืนแล้ว");
    }

    // Check all payments belong to the same user
    const payerIds = new Set(payments.map(p => p.paidByUserId));
    if (payerIds.size > 1) {
      return apiResponse.badRequest("รายการที่เลือกต้องเป็นของพนักงานคนเดียวกัน");
    }

    // Calculate total amount
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const payerName = payments[0].PaidByUser?.name || "พนักงาน";
    const payerId = payments[0].paidByUserId;

    // Build description from payments
    const paymentDescriptions = payments
      .map(p => p.Expense.description || "ไม่ระบุ")
      .slice(0, 3) // Take first 3
      .join(", ");
    const moreCount = payments.length > 3 ? ` และอีก ${payments.length - 3} รายการ` : "";

    // Get the settlement date from the most recent payment
    const settlementDate = payments
      .filter(p => p.settledAt)
      .sort((a, b) => new Date(b.settledAt!).getTime() - new Date(a.settledAt!).getTime())[0]
      ?.settledAt || new Date();

    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        amount: totalAmount,
        vatRate: 0, // No VAT for reimbursement transfers
        vatAmount: 0,
        netPaid: totalAmount,
        description: `โอนคืนค่าใช้จ่าย - ${payerName}`,
        referenceNo: `REIMB-${Date.now()}`,
        paymentMethod: "BANK_TRANSFER",
        billDate: new Date(settlementDate),
        workflowStatus: "COMPLETED",
        notes: notes 
          ? `${notes}\n\nรายการที่โอนคืน: ${paymentDescriptions}${moreCount}`
          : `รายการที่โอนคืน: ${paymentDescriptions}${moreCount}`,
        contactName: payerName, // Store employee name as contact name
        createdBy: session.user.id,
        updatedAt: new Date(),
        accountId: accountId || null,
        // Store metadata about the settlement
        otherDocUrls: [JSON.stringify({ 
          type: "reimbursement_settlement",
          paymentIds,
          payerName,
          payerId,
        })],
      },
    });

    // Create expense payment for company
    await prisma.expensePayment.create({
      data: {
        expenseId: expense.id,
        amount: totalAmount,
        paidByType: "COMPANY",
        settlementStatus: "SETTLED",
        settledAt: new Date(settlementDate),
        settledBy: session.user.id,
      },
    });

    return apiResponse.success({
      expense: {
        id: expense.id,
        description: expense.description,
        amount: totalAmount,
        payerName,
      },
      message: `สร้างรายจ่ายสำเร็จ: ฿${totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
    });
  },
  { permission: "settlements:write" }
);
