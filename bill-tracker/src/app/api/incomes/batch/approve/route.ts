/**
 * POST /api/incomes/batch/approve
 * Approve multiple incomes at once
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

      // Find all incomes
      const incomes = await prisma.income.findMany({
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

      for (const income of incomes) {
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
          companyId: company.id,
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
            companyId: company.id,
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
    },
    { permission: "incomes:approve" }
  )(request);
};
