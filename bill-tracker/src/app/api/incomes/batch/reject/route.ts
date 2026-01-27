/**
 * POST /api/incomes/batch/reject
 * Reject multiple incomes at once
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

      const results: RejectResult[] = [];

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

        // Reject
        await prisma.income.update({
          where: { id: income.id },
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
            incomeId: income.id,
            eventType: "REJECTED",
            createdBy: session.user.id,
            notes: reason.trim(),
          },
        });

        await createAuditLog({
          userId: session.user.id,
          companyId: company.id,
          action: "UPDATE",
          entityType: "Income",
          entityId: income.id,
          description: `ปฏิเสธรายรับ: ${income.source || "ไม่ระบุ"} เหตุผล: ${reason}`,
          changes: {
            before: { approvalStatus: "PENDING" },
            after: { approvalStatus: "REJECTED", rejectedReason: reason },
          },
        });

        // Notify the requester
        if (income.createdBy) {
          await createNotification({
            companyId: company.id,
            targetUserIds: [income.createdBy],
            type: "TRANSACTION_REJECTED",
            entityType: "Income",
            entityId: income.id,
            title: "รายรับถูกปฏิเสธ",
            message: `รายรับ "${income.source || "ไม่ระบุ"}" ถูกปฏิเสธ: ${reason}`,
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
    { permission: "incomes:approve" }
  )(request);
};
