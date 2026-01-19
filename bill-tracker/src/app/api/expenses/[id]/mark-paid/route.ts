/**
 * POST /api/expenses/[id]/mark-paid
 * Mark an approved expense as paid
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import type { ExpenseWorkflowStatus } from "@prisma/client";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withCompanyAccess(
    async (req, { company, session }) => {
      const { id } = await routeParams.params;

      // Find the expense
      const expense = await prisma.expense.findFirst({
        where: {
          id,
          companyId: company.id,
          deletedAt: null,
        },
        include: {
          Contact: true,
        },
      });

      if (!expense) {
        return apiResponse.notFound("ไม่พบรายจ่าย");
      }

      // Can only mark as paid if:
      // 1. DRAFT + NOT_REQUIRED (user has create-direct permission)
      // 2. DRAFT + APPROVED (approved by approver)
      const canMarkPaid =
        expense.workflowStatus === "DRAFT" &&
        (expense.approvalStatus === "NOT_REQUIRED" ||
          expense.approvalStatus === "APPROVED");

      if (!canMarkPaid) {
        if (expense.approvalStatus === "PENDING") {
          return apiResponse.badRequest("รายการนี้ยังรออนุมัติอยู่");
        }
        if (expense.approvalStatus === "REJECTED") {
          return apiResponse.badRequest("รายการนี้ถูกปฏิเสธ กรุณาแก้ไขและส่งใหม่");
        }
        if (expense.workflowStatus !== "DRAFT") {
          return apiResponse.badRequest("รายการนี้ไม่อยู่ในสถานะร่าง");
        }
        return apiResponse.badRequest("ไม่สามารถบันทึกจ่ายเงินได้ในสถานะนี้");
      }

      // Determine workflow based on document type and state
      const isWht = expense.isWht || false;
      const hasTaxInvoice = expense.hasTaxInvoice || false;
      const documentType = expense.documentType || "TAX_INVOICE";
      
      let targetWorkflowStatus: ExpenseWorkflowStatus;
      
      // For NO_DOCUMENT type, skip directly to READY_FOR_ACCOUNTING
      if (documentType === "NO_DOCUMENT") {
        targetWorkflowStatus = "READY_FOR_ACCOUNTING";
      } else if (hasTaxInvoice) {
        // Has document already - check WHT (only for VAT 7% / TAX_INVOICE type)
        targetWorkflowStatus = (isWht && documentType === "TAX_INVOICE") ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";
      } else {
        // Waiting for document (tax invoice or cash receipt)
        targetWorkflowStatus = "WAITING_TAX_INVOICE";
      }

      // Update the expense
      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          workflowStatus: targetWorkflowStatus,
          updatedAt: new Date(),
        },
        include: {
          Contact: true,
          Account: true,
        },
      });

      // Create document event
      await prisma.documentEvent.create({
        data: {
          id: crypto.randomUUID(),
          expenseId: id,
          eventType: "MARKED_AS_PAID",
          fromStatus: "DRAFT",
          toStatus: targetWorkflowStatus,
          createdBy: session.user.id,
          notes: "บันทึกจ่ายเงินแล้ว",
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "STATUS_CHANGE",
        entityType: "Expense",
        entityId: id,
        description: `บันทึกจ่ายเงินแล้ว: ${expense.description || "ไม่ระบุ"}`,
        changes: {
          before: { workflowStatus: "DRAFT" },
          after: { workflowStatus: targetWorkflowStatus },
        },
      });

      return apiResponse.success(
        { expense: updatedExpense },
        "บันทึกจ่ายเงินแล้ว"
      );
    },
    { permission: "expenses:mark-paid" }
  )(request);
};
