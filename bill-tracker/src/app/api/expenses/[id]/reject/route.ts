/**
 * POST /api/expenses/[id]/reject
 * Reject an expense that is pending approval
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyRejection } from "@/lib/notifications/line-messaging";
import { getBaseUrl } from "@/lib/utils/get-base-url";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (req, { session }) => {
      const { id } = await routeParams.params;
      const body = await req.json();
      const { reason } = body;

      // Validate reason
      if (!reason || reason.trim() === "") {
        return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
      }

      // Find the expense first (without company filter - we'll check access separately)
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

      // Check if user has expenses:approve permission
      const permissions = (access.permissions as string[]) || [];
      const canApprove = access.isOwner || 
        permissions.includes("expenses:approve") || 
        permissions.includes("expenses:*");
      
      if (!canApprove) {
        return apiResponse.forbidden("คุณไม่มีสิทธิ์ปฏิเสธรายจ่าย");
      }

      // Only PENDING can be rejected
      if (expense.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถปฏิเสธได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      // Update the expense
      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
          rejectedReason: reason.trim(),
          approvedBy: session.user.id,
          approvedAt: new Date(),
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
          eventType: "REJECTED",
          createdBy: session.user.id,
          notes: `ปฏิเสธรายจ่าย: ${reason.trim()}`,
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "STATUS_CHANGE",
        entityType: "Expense",
        entityId: id,
        description: `ปฏิเสธรายจ่าย: ${expense.description || "ไม่ระบุ"} เหตุผล: ${reason.trim()}`,
        changes: {
          before: { approvalStatus: "PENDING" },
          after: { approvalStatus: "REJECTED", rejectedReason: reason.trim() },
        },
      });

      // Notify the requester
      if (expense.createdBy) {
        await createNotification({
          companyId: company.id,
          targetUserIds: [expense.createdBy],
          type: "TRANSACTION_REJECTED",
          entityType: "Expense",
          entityId: id,
          title: "รายจ่ายถูกปฏิเสธ",
          message: `รายจ่าย "${expense.description || "ไม่ระบุ"}" ถูกปฏิเสธโดย ${session.user.name}: ${reason.trim()}`,
          actorId: session.user.id,
          actorName: session.user.name,
          metadata: { reason: reason.trim() },
        });
      }

      // Send LINE notification
      const submitter = expense.submittedBy 
        ? await prisma.user.findUnique({ where: { id: expense.submittedBy }, select: { name: true } })
        : null;
      
      await notifyRejection(company.id, {
        id,
        companyCode: company.code.toLowerCase(),
        companyName: company.name,
        type: "expense",
        description: expense.description || undefined,
        vendorOrCustomer: expense.Contact?.name || undefined,
        amount: Number(expense.netPaid),
        submitterName: submitter?.name || "ไม่ระบุ",
        approverName: session.user.name || undefined,
        rejectedReason: reason.trim(),
      }, getBaseUrl());

      return apiResponse.success(
        { expense: updatedExpense },
        "ปฏิเสธรายจ่ายแล้ว"
      );
    }
  )(request);
};
