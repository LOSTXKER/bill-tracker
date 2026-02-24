/**
 * POST /api/expenses/batch/approve
 * Approve multiple expenses at once
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";

interface ApproveResult {
  id: string;
  success: boolean;
  error?: string;
}

export const POST = (request: Request) => {
  return withAuth(
    async (req, { session }) => {
      const body = await req.json();
      const { ids } = body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return apiResponse.badRequest("กรุณาเลือกรายการที่ต้องการอนุมัติ");
      }

      const MAX_BATCH_SIZE = 50;
      if (ids.length > MAX_BATCH_SIZE) {
        return apiResponse.badRequest(`ไม่สามารถดำเนินการเกิน ${MAX_BATCH_SIZE} รายการต่อครั้ง`);
      }

      // Find all expenses (without company filter first, we'll check access per item)
      const expenses = await prisma.expense.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        include: {
          Contact: true,
          Company: true,
        },
      });

      if (expenses.length === 0) {
        return apiResponse.notFound("ไม่พบรายการที่เลือก");
      }

      // Get unique company IDs from selected expenses
      const companyIds = [...new Set(expenses.map(e => e.companyId))];
      
      // Check user has access to all companies involved
      const accessRecords = await prisma.companyAccess.findMany({
        where: {
          userId: session.user.id,
          companyId: { in: companyIds },
        },
      });

      // Create a map of company access for quick lookup
      const accessMap = new Map(accessRecords.map(a => [a.companyId, a]));

      const results: ApproveResult[] = [];
      const approvedIds: string[] = [];

      for (const expense of expenses) {
        // Check user has access to this expense's company
        const access = accessMap.get(expense.companyId);
        if (!access) {
          results.push({
            id: expense.id,
            success: false,
            error: "คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้",
          });
          continue;
        }

        // Check permission
        const permissions = (access.permissions as string[]) || [];
        const canApprove = access.isOwner || 
          permissions.includes("expenses:approve") || 
          permissions.includes("expenses:*");
        
        if (!canApprove) {
          results.push({
            id: expense.id,
            success: false,
            error: "คุณไม่มีสิทธิ์อนุมัติรายจ่าย",
          });
          continue;
        }

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
          companyId: expense.companyId,
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
            companyId: expense.companyId,
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
    }
  )(request);
};
