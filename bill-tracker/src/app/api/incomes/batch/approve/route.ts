/**
 * POST /api/incomes/batch/approve
 * Approve multiple incomes at once
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

      // Find all incomes (without company filter first, we'll check access per item)
      const incomes = await prisma.income.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        include: {
          Contact: true,
          Company: true,
        },
      });

      if (incomes.length === 0) {
        return apiResponse.notFound("ไม่พบรายการที่เลือก");
      }

      // Get unique company IDs from selected incomes
      const companyIds = [...new Set(incomes.map(i => i.companyId))];
      
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

      for (const income of incomes) {
        // Check user has access to this income's company
        const access = accessMap.get(income.companyId);
        if (!access) {
          results.push({
            id: income.id,
            success: false,
            error: "คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้",
          });
          continue;
        }

        // Check permission
        const permissions = (access.permissions as string[]) || [];
        const canApprove = access.isOwner || 
          permissions.includes("incomes:approve") || 
          permissions.includes("incomes:*");
        
        if (!canApprove) {
          results.push({
            id: income.id,
            success: false,
            error: "คุณไม่มีสิทธิ์อนุมัติรายรับ",
          });
          continue;
        }

        // Check if PENDING
        if (income.approvalStatus !== "PENDING") {
          results.push({
            id: income.id,
            success: false,
            error: "รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ",
          });
          continue;
        }

        // Prevent self-approval
        if (income.submittedBy === session.user.id) {
          results.push({
            id: income.id,
            success: false,
            error: "ไม่สามารถอนุมัติคำขอของตัวเองได้",
          });
          continue;
        }

        // Approve
        await prisma.income.update({
          where: { id: income.id },
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
            incomeId: income.id,
            eventType: "APPROVED",
            createdBy: session.user.id,
            notes: "อนุมัติรายรับ (Batch)",
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: income.companyId,
          action: "APPROVE",
          entityType: "Income",
          entityId: income.id,
          description: `อนุมัติรายรับ: ${income.source || "ไม่ระบุ"} (Batch)`,
          changes: {
            before: { approvalStatus: "PENDING" },
            after: { approvalStatus: "APPROVED" },
          },
        });

        // Notify the requester
        if (income.createdBy) {
          await createNotification({
            companyId: income.companyId,
            targetUserIds: [income.createdBy],
            type: "TRANSACTION_APPROVED",
            entityType: "Income",
            entityId: income.id,
            title: "รายรับได้รับการอนุมัติ",
            message: `รายรับ "${income.source || "ไม่ระบุ"}" ได้รับการอนุมัติ`,
            actorId: session.user.id,
            actorName: session.user.name,
          });
        }

        results.push({ id: income.id, success: true });
      }

      // Find IDs that weren't found
      const foundIds = incomes.map((i) => i.id);
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
