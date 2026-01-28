/**
 * POST /api/incomes/[id]/withdraw
 * Withdraw an income approval request (by the submitter)
 * Changes approvalStatus from PENDING back to NOT_REQUIRED
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (req, { session }) => {
      const { id } = await routeParams.params;

      // Find the income first (without company filter - we'll check access separately)
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

      // Only PENDING can be withdrawn
      if (income.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถยกเลิกได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      // Only the submitter or creator can withdraw
      const isSubmitter = income.submittedBy === session.user.id;
      const isCreator = income.createdBy === session.user.id;
      
      if (!isSubmitter && !isCreator) {
        return apiResponse.forbidden("เฉพาะผู้ส่งคำขอหรือผู้สร้างรายการเท่านั้นที่สามารถยกเลิกคำขอได้");
      }

      // Update the income - reset to NOT_REQUIRED (draft state)
      const updatedIncome = await prisma.income.update({
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
          incomeId: id,
          eventType: "WITHDRAWN",
          createdBy: session.user.id,
          notes: "ยกเลิกคำขออนุมัติ",
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "UPDATE",
        entityType: "Income",
        entityId: id,
        description: `ยกเลิกคำขออนุมัติรายรับ: ${income.source || "ไม่ระบุ"}`,
        changes: {
          before: { approvalStatus: "PENDING" },
          after: { approvalStatus: "NOT_REQUIRED" },
        },
      });

      return apiResponse.success(
        { income: updatedIncome },
        "ยกเลิกคำขออนุมัติแล้ว"
      );
    }
  )(request);
};
