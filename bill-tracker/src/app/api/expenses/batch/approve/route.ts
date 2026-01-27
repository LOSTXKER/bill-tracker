/**
 * POST /api/expenses/batch/approve
 * Approve multiple expenses at once
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";

interface ApproveResult {
  id: string;
  success: boolean;
  error?: string;
}

export const POST = (request: Request) => {
  return withCompanyAccess(
    async (req, { company, session }) => {
      const body = await req.json();
      const { ids } = body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return apiResponse.badRequest("กรุณาเลือกรายการที่ต้องการอนุมัติ");
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

      const results: ApproveResult[] = [];
      const approvedIds: string[] = [];

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

        // Prevent self-approval
        if (expense.submittedBy === session.user.id) {
          results.push({
            id: expense.id,
            success: false,
            error: "ไม่สามารถอนุมัติคำขอของตัวเองได้",
          });
          continue;
        }

        // Approve
        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            approvalStatus: "APPROVED",
            approvedBy: session.user.id,
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create document event
        await prisma.documentEvent.create({
          data: {
            id: crypto.randomUUID(),
            expenseId: expense.id,
            eventType: "APPROVED",
            createdBy: session.user.id,
            notes: "อนุมัติรายจ่าย (Batch)",
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "APPROVE",
          entityType: "Expense",
          entityId: expense.id,
          description: `อนุมัติรายจ่าย: ${expense.description || "ไม่ระบุ"} (Batch)`,
          changes: {
            before: { approvalStatus: "PENDING" },
            after: { approvalStatus: "APPROVED" },
          },
        });

        // Notify the requester
        if (expense.createdBy) {
          await createNotification({
            companyId: company.id,
            targetUserIds: [expense.createdBy],
            type: "TRANSACTION_APPROVED",
            entityType: "Expense",
            entityId: expense.id,
            title: "รายจ่ายได้รับการอนุมัติ",
            message: `รายจ่าย "${expense.description || "ไม่ระบุ"}" ได้รับการอนุมัติ`,
            actorId: session.user.id,
            actorName: session.user.name,
          });
        }

        results.push({ id: expense.id, success: true });
        approvedIds.push(expense.id);
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

      const approvedCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return apiResponse.success(
        {
          approved: approvedCount,
          failed: failedCount,
          results,
        },
        `อนุมัติแล้ว ${approvedCount} รายการ${failedCount > 0 ? `, ไม่สำเร็จ ${failedCount} รายการ` : ""}`
      );
    },
    { permission: "expenses:approve" }
  )(request);
};
