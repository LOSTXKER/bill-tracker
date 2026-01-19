/**
 * POST /api/incomes/[id]/mark-received
 * Mark an approved income as received
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
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

      // Can only mark as received if:
      // 1. DRAFT + NOT_REQUIRED (user has create-direct permission)
      // 2. DRAFT + APPROVED (approved by approver)
      const canMarkReceived =
        income.workflowStatus === "DRAFT" &&
        (income.approvalStatus === "NOT_REQUIRED" ||
          income.approvalStatus === "APPROVED");

      if (!canMarkReceived) {
        if (income.approvalStatus === "PENDING") {
          return apiResponse.badRequest("รายการนี้ยังรออนุมัติอยู่");
        }
        if (income.approvalStatus === "REJECTED") {
          return apiResponse.badRequest("รายการนี้ถูกปฏิเสธ กรุณาแก้ไขและส่งใหม่");
        }
        if (income.workflowStatus !== "DRAFT") {
          return apiResponse.badRequest("รายการนี้ไม่อยู่ในสถานะร่าง");
        }
        return apiResponse.badRequest("ไม่สามารถบันทึกรับเงินได้ในสถานะนี้");
      }

      // Determine workflow based on document state
      const isWhtDeducted = income.isWhtDeducted || false;
      const hasInvoice = income.hasInvoice || false;
      
      let targetWorkflowStatus: IncomeWorkflowStatus;
      if (hasInvoice) {
        targetWorkflowStatus = isWhtDeducted ? "WHT_PENDING_CERT" : "READY_FOR_ACCOUNTING";
      } else {
        targetWorkflowStatus = "WAITING_INVOICE_ISSUE";
      }

      // Update the income
      const updatedIncome = await prisma.income.update({
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
          incomeId: id,
          eventType: "MARKED_AS_PAID",
          fromStatus: "DRAFT",
          toStatus: targetWorkflowStatus,
          createdBy: session.user.id,
          notes: "บันทึกรับเงินแล้ว",
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
    },
    { permission: "incomes:mark-received" }
  )(request);
};
