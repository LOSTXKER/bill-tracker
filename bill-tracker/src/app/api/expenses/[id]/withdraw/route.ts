/**
 * POST /api/expenses/[id]/withdraw
 * Withdraw an expense approval request (by the submitter)
 * Changes approvalStatus from PENDING back to NOT_REQUIRED
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

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

      // Only PENDING can be withdrawn
      if (expense.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถยกเลิกได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      // Only the submitter or creator can withdraw
      const isSubmitter = expense.submittedBy === session.user.id;
      const isCreator = expense.createdBy === session.user.id;
      
      if (!isSubmitter && !isCreator) {
        return apiResponse.forbidden("เฉพาะผู้ส่งคำขอหรือผู้สร้างรายการเท่านั้นที่สามารถยกเลิกคำขอได้");
      }

      // Update the expense - reset to NOT_REQUIRED (draft state)
      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          approvalStatus: "NOT_REQUIRED",
          submittedAt: null,
          submittedBy: null,
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
          eventType: "WITHDRAWN",
          createdBy: session.user.id,
          notes: "ยกเลิกคำขออนุมัติ",
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "UPDATE",
        entityType: "Expense",
        entityId: id,
        description: `ยกเลิกคำขออนุมัติรายจ่าย: ${expense.description || "ไม่ระบุ"}`,
        changes: {
          before: { approvalStatus: "PENDING" },
          after: { approvalStatus: "NOT_REQUIRED" },
        },
      });

      return apiResponse.success(
        { expense: updatedExpense },
        "ยกเลิกคำขออนุมัติแล้ว"
      );
    },
    { permission: "expenses:read" } // Only need read permission since we check submitter/creator
  )(request);
};
