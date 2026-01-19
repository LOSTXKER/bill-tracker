/**
 * POST /api/expenses/[id]/submit
 * Submit expense for approval (or mark as paid if user has create-direct permission)
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import type { ExpenseWorkflowStatus } from "@prisma/client";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (req, { session }) => {
      const { id } = await routeParams.params;

      // Find the expense with company info
      const expense = await prisma.expense.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          Contact: true,
          Company: true,
        },
      });

      if (!expense) {
        return apiResponse.notFound("ไม่พบรายจ่าย");
      }

      const company = expense.Company;
      if (!company) {
        return apiResponse.badRequest("ไม่พบข้อมูลบริษัท");
      }

      // Check if user has access to this company
      const access = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: session.user.id,
            companyId: company.id,
          },
        },
      });

      if (!access) {
        return apiResponse.forbidden("คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้");
      }

      // Check if user has expenses:create permission
      const permissions = (access.permissions as string[]) || [];
      const hasCreatePermission = access.isOwner || 
        permissions.includes("expenses:create") || 
        permissions.includes("expenses:*");
      
      if (!hasCreatePermission) {
        return apiResponse.forbidden("คุณไม่มีสิทธิ์สร้างรายจ่าย");
      }

      // Check current status - be flexible for existing records
      const currentWorkflowStatus = expense.workflowStatus;
      const currentApprovalStatus = expense.approvalStatus;
      
      // Log for debugging
      console.log(`[Submit Expense] id=${id}, workflowStatus=${currentWorkflowStatus}, approvalStatus=${currentApprovalStatus}`);

      // Only DRAFT can be submitted (or null for old records before migration)
      if (currentWorkflowStatus !== "DRAFT" && currentWorkflowStatus !== null) {
        return apiResponse.badRequest(
          `สามารถส่งได้เฉพาะรายการร่างเท่านั้น (สถานะปัจจุบัน: ${currentWorkflowStatus})`
        );
      }

      // Check if already submitted
      if (currentApprovalStatus === "PENDING") {
        return apiResponse.badRequest("รายการนี้ส่งอนุมัติแล้ว กรุณารอการอนุมัติ");
      }
      
      // Allow resubmission if rejected
      if (currentApprovalStatus === "REJECTED") {
        // Reset rejected reason when resubmitting
        await prisma.expense.update({
          where: { id },
          data: { rejectedReason: null },
        });
      }

      // Check if user has create-direct permission
      const canCreateDirect = access.isOwner ||
        permissions.includes("expenses:create-direct") ||
        permissions.includes("expenses:*");

      // Determine workflow based on document type and state
      const isWht = expense.isWht || false;
      const hasTaxInvoice = expense.hasTaxInvoice || false;
      const documentType = expense.documentType || "TAX_INVOICE";
      
      let targetWorkflowStatus: ExpenseWorkflowStatus;
      
      // For NO_DOCUMENT type, skip directly to READY_FOR_ACCOUNTING
      // (NO_DOCUMENT means VAT 0% which means no WHT)
      if (documentType === "NO_DOCUMENT") {
        targetWorkflowStatus = "READY_FOR_ACCOUNTING";
      } else if (hasTaxInvoice) {
        // Has document already - check WHT (only for VAT 7% / TAX_INVOICE type)
        targetWorkflowStatus = (isWht && documentType === "TAX_INVOICE") ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";
      } else {
        // Waiting for document (tax invoice or cash receipt)
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
    }
  )(request);
};
