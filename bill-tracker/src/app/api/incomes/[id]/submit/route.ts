/**
 * POST /api/incomes/[id]/submit
 * Submit income for approval (or mark as received if user has create-direct permission)
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import type { IncomeWorkflowStatus } from "@prisma/client";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withCompanyAccess(
    async (req, { company, session }) => {
      const { id } = await routeParams.params;

      // Find the income
      const income = await prisma.income.findFirst({
        where: {
          id,
          companyId: company.id,
          deletedAt: null,
        },
        include: {
          Contact: true,
        },
      });

      if (!income) {
        return apiResponse.notFound("ไม่พบรายรับ");
      }

      // Check current status - be flexible for existing records
      const currentWorkflowStatus = income.workflowStatus;
      const currentApprovalStatus = income.approvalStatus;
      
      // Log for debugging
      console.log(`[Submit Income] id=${id}, workflowStatus=${currentWorkflowStatus}, approvalStatus=${currentApprovalStatus}`);

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
        await prisma.income.update({
          where: { id },
          data: { rejectedReason: null },
        });
      }

      // Check if user has create-direct permission
      const canCreateDirect = await hasPermission(
        session.user.id,
        company.id,
        "incomes:create-direct"
      );

      // Determine workflow based on document state
      const isWhtDeducted = income.isWhtDeducted || false;
      const hasInvoice = income.hasInvoice || false;
      
      let targetWorkflowStatus: IncomeWorkflowStatus;
      if (hasInvoice) {
        targetWorkflowStatus = isWhtDeducted ? "WHT_PENDING_CERT" : "READY_FOR_ACCOUNTING";
      } else {
        targetWorkflowStatus = "WAITING_INVOICE_ISSUE";
      }

      if (canCreateDirect) {
        // User can create directly - mark as RECEIVED
        const updatedIncome = await prisma.income.update({
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
            incomeId: id,
            eventType: "MARKED_AS_PAID",
            fromStatus: "DRAFT",
            toStatus: targetWorkflowStatus,
            createdBy: session.user.id,
            notes: "ส่งและบันทึกรับเงินแล้ว (ไม่ต้องอนุมัติ)",
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "STATUS_CHANGE",
          entityType: "Income",
          entityId: id,
          description: `บันทึกรับเงินแล้ว: ${income.source || "ไม่ระบุ"}`,
          changes: {
            before: { workflowStatus: "DRAFT" },
            after: { workflowStatus: targetWorkflowStatus },
          },
        });

        return apiResponse.success(
          { income: updatedIncome },
          "บันทึกรับเงินแล้ว"
        );
      } else {
        // User needs approval - set to PENDING
        const updatedIncome = await prisma.income.update({
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
            incomeId: id,
            eventType: "SUBMITTED_FOR_APPROVAL",
            createdBy: session.user.id,
            notes: "ส่งคำขออนุมัติ",
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "STATUS_CHANGE",
          entityType: "Income",
          entityId: id,
          description: `ส่งคำขออนุมัติรายรับ: ${income.source || "ไม่ระบุ"}`,
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
                  array_contains: ["incomes:approve"],
                },
              },
              {
                permissions: {
                  array_contains: ["incomes:*"],
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
            entityType: "Income",
            entityId: id,
            title: "คำขออนุมัติรายรับใหม่",
            message: `${session.user.name} ส่งคำขออนุมัติรายรับ: ${income.source || "ไม่ระบุ"} จำนวน ${income.netReceived} บาท`,
            actorId: session.user.id,
            actorName: session.user.name,
          });
        }

        return apiResponse.success(
          { income: updatedIncome },
          "ส่งคำขออนุมัติแล้ว"
        );
      }
    },
    { permission: "incomes:create" }
  )(request);
};
