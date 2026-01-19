/**
 * POST /api/expenses/[id]/submit
 * Submit expense for approval (or mark as paid if user has create-direct permission)
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
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

      // Only DRAFT can be submitted
      if (expense.workflowStatus !== "DRAFT") {
        return apiResponse.badRequest("สามารถส่งได้เฉพาะรายการร่างเท่านั้น");
      }

      // Check if already submitted
      if (expense.approvalStatus === "PENDING") {
        return apiResponse.badRequest("รายการนี้ส่งอนุมัติแล้ว");
      }

      // Check if user has create-direct permission
      const canCreateDirect = await hasPermission(
        session.user.id,
        company.id,
        "expenses:create-direct"
      );

      // Determine workflow based on document state
      const isWht = expense.isWht || false;
      const hasTaxInvoice = expense.hasTaxInvoice || false;
      
      let targetWorkflowStatus: ExpenseWorkflowStatus;
      if (hasTaxInvoice) {
        targetWorkflowStatus = isWht ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";
      } else {
        targetWorkflowStatus = "WAITING_TAX_INVOICE";
      }

      if (canCreateDirect) {
        // User can create directly - mark as PAID
        const updatedExpense = await prisma.expense.update({
          where: { id },
          data: {
            workflowStatus: targetWorkflowStatus,
            approvalStatus: "NOT_REQUIRED",
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
            notes: "ส่งและบันทึกจ่ายเงินแล้ว (ไม่ต้องอนุมัติ)",
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
      } else {
        // User needs approval - set to PENDING
        const updatedExpense = await prisma.expense.update({
          where: { id },
          data: {
            approvalStatus: "PENDING",
            submittedAt: new Date(),
            submittedBy: session.user.id,
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
            eventType: "SUBMITTED_FOR_APPROVAL",
            createdBy: session.user.id,
            notes: "ส่งคำขออนุมัติ",
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "STATUS_CHANGE",
          entityType: "Expense",
          entityId: id,
          description: `ส่งคำขออนุมัติรายจ่าย: ${expense.description || "ไม่ระบุ"}`,
          changes: {
            before: { approvalStatus: "NOT_REQUIRED" },
            after: { approvalStatus: "PENDING" },
          },
        });

        // Notify approvers
        const approvers = await prisma.companyAccess.findMany({
          where: {
            companyId: company.id,
            OR: [
              { isOwner: true },
              {
                permissions: {
                  array_contains: ["expenses:approve"],
                },
              },
              {
                permissions: {
                  array_contains: ["expenses:*"],
                },
              },
            ],
          },
          select: { userId: true },
        });

        if (approvers.length > 0) {
          await createNotification({
            companyId: company.id,
            targetUserIds: approvers.map((a) => a.userId),
            type: "TRANSACTION_SUBMITTED",
            entityType: "Expense",
            entityId: id,
            title: "คำขออนุมัติรายจ่ายใหม่",
            message: `${session.user.name} ส่งคำขออนุมัติรายจ่าย: ${expense.description || "ไม่ระบุ"} จำนวน ${expense.netPaid} บาท`,
            actorId: session.user.id,
            actorName: session.user.name,
          });
        }

        return apiResponse.success(
          { expense: updatedExpense },
          "ส่งคำขออนุมัติแล้ว"
        );
      }
    },
    { permission: "expenses:create" }
  )(request);
};
