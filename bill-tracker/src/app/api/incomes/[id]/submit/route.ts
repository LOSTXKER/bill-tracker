/**
 * POST /api/incomes/[id]/submit
 * Submit income for approval (or mark as received if user has create-direct permission)
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyApprovalRequest } from "@/lib/notifications/line-messaging";
import { getBaseUrl } from "@/lib/utils/get-base-url";
import type { IncomeWorkflowStatus } from "@prisma/client";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (req, { session }) => {
      const { id } = await routeParams.params;

      // Find the income with company info
      const income = await prisma.income.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          Contact: true,
          Company: true,
        },
      });

      if (!income) {
        return apiResponse.notFound("ไม่พบรายรับ");
      }

      const company = income.Company;
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

      // Check if user has incomes:create permission
      const permissions = (access.permissions as string[]) || [];
      const hasCreatePermission = access.isOwner || 
        permissions.includes("incomes:create") || 
        permissions.includes("incomes:*");
      
      if (!hasCreatePermission) {
        return apiResponse.forbidden("คุณไม่มีสิทธิ์สร้างรายรับ");
      }

      // Check current status - be flexible for existing records
      const currentWorkflowStatus = income.workflowStatus;
      const currentApprovalStatus = income.approvalStatus;
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log(`[Submit Income] id=${id}, workflowStatus=${currentWorkflowStatus}, approvalStatus=${currentApprovalStatus}`);
      }

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
      const canCreateDirect = access.isOwner ||
        permissions.includes("incomes:create-direct") ||
        permissions.includes("incomes:*");

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

        // Send LINE notification
        await notifyApprovalRequest(company.id, {
          id,
          companyCode: company.code.toLowerCase(),
          companyName: company.name,
          type: "income",
          description: income.source || undefined,
          vendorOrCustomer: income.Contact?.name || undefined,
          amount: Number(income.netReceived),
          submitterName: session.user.name || "ไม่ระบุ",
        }, getBaseUrl());

        return apiResponse.success(
          { income: updatedIncome },
          "ส่งคำขออนุมัติแล้ว"
        );
      }
    }
  )(request);
};
