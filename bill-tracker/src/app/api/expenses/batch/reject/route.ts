/**
 * POST /api/expenses/batch/reject
 * Reject multiple expenses at once
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";

interface RejectResult {
  id: string;
  success: boolean;
  error?: string;
}

export const POST = (request: Request) => {
  return withCompanyAccess(
    async (req, { company, session }) => {
      const body = await req.json();
      const { ids, reason } = body as { ids: string[]; reason: string };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return apiResponse.badRequest("กรุณาเลือกรายการที่ต้องการปฏิเสธ");
      }

      if (!reason || !reason.trim()) {
        return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
      }

      // Find all expenses
      const expenses = await prisma.expense.findMany({
        where: {
          id: { in: ids },
          companyId: company.id,
          deletedAt: null,
        },
        include: {
          Contact: true,
        },
      });

      const results: RejectResult[] = [];

      for (const expense of expenses) {
        // Check if PENDING
        if (expense.approvalStatus !== "PENDING") {
          results.push({
            id: expense.id,
            success: false,
            error: "รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ",
          });
          continue;
        }

        // Reject
        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            approvalStatus: "REJECTED",
            rejectedReason: reason.trim(),
            updatedAt: new Date(),
          },
        });

        // Create document event
        await prisma.documentEvent.create({
          data: {
            id: crypto.randomUUID(),
            expenseId: expense.id,
            eventType: "REJECTED",
            createdBy: session.user.id,
            notes: reason.trim(),
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "UPDATE",
          entityType: "Expense",
          entityId: expense.id,
          description: `ปฏิเสธรายจ่าย: ${expense.description || "ไม่ระบุ"} เหตุผล: ${reason}`,
          changes: {
            before: { approvalStatus: "PENDING" },
            after: { approvalStatus: "REJECTED", rejectedReason: reason },
          },
        });

        // Notify the requester
        if (expense.createdBy) {
          await createNotification({
            companyId: company.id,
            targetUserIds: [expense.createdBy],
            type: "TRANSACTION_REJECTED",
            entityType: "Expense",
            entityId: expense.id,
            title: "รายจ่ายถูกปฏิเสธ",
            message: `รายจ่าย "${expense.description || "ไม่ระบุ"}" ถูกปฏิเสธ: ${reason}`,
            actorId: session.user.id,
            actorName: session.user.name,
          });
        }

        results.push({ id: expense.id, success: true });
      }

      // Find IDs that weren't found
      const foundIds = expenses.map((e) => e.id);
      const notFoundIds = ids.filter((id) => !foundIds.includes(id));
      for (const id of notFoundIds) {
        results.push({
          id,
          success: false,
          error: "ไม่พบรายการ",
        });
      }

      const rejectedCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return apiResponse.success(
        {
          rejected: rejectedCount,
          failed: failedCount,
          results,
        },
        `ปฏิเสธแล้ว ${rejectedCount} รายการ${failedCount > 0 ? `, ไม่สำเร็จ ${failedCount} รายการ` : ""}`
      );
    },
    { permission: "expenses:approve" }
  )(request);
};
