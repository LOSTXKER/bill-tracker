/**
 * POST /api/incomes/[id]/reject
 * Reject an income that is pending approval
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyRejection } from "@/lib/notifications/line-messaging";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withCompanyAccess(
    async (req, { company, session }) => {
      const { id } = await routeParams.params;
      const body = await req.json();
      const { reason } = body;

      // Validate reason
      if (!reason || reason.trim() === "") {
        return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
      }

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

      // Only PENDING can be rejected
      if (income.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถปฏิเสธได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      // Update the income
      const updatedIncome = await prisma.income.update({
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
          incomeId: id,
          eventType: "REJECTED",
          createdBy: session.user.id,
          notes: `ปฏิเสธรายรับ: ${reason.trim()}`,
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "STATUS_CHANGE",
        entityType: "Income",
        entityId: id,
        description: `ปฏิเสธรายรับ: ${income.source || "ไม่ระบุ"} เหตุผล: ${reason.trim()}`,
        changes: {
          before: { approvalStatus: "PENDING" },
          after: { approvalStatus: "REJECTED", rejectedReason: reason.trim() },
        },
      });

      // Notify the requester
      if (income.createdBy) {
        await createNotification({
          companyId: company.id,
          targetUserIds: [income.createdBy],
          type: "TRANSACTION_REJECTED",
          entityType: "Income",
          entityId: id,
          title: "รายรับถูกปฏิเสธ",
          message: `รายรับ "${income.source || "ไม่ระบุ"}" ถูกปฏิเสธโดย ${session.user.name}: ${reason.trim()}`,
          actorId: session.user.id,
          actorName: session.user.name,
          metadata: { reason: reason.trim() },
        });
      }

      // Send LINE notification
      const submitter = income.submittedBy 
        ? await prisma.user.findUnique({ where: { id: income.submittedBy }, select: { name: true } })
        : null;
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";
      
      await notifyRejection(company.id, {
        id,
        companyCode: company.code.toLowerCase(),
        companyName: company.name,
        type: "income",
        description: income.source || undefined,
        vendorOrCustomer: income.Contact?.name || undefined,
        amount: Number(income.netReceived),
        submitterName: submitter?.name || "ไม่ระบุ",
        approverName: session.user.name || undefined,
        rejectedReason: reason.trim(),
      }, baseUrl);

      return apiResponse.success(
        { income: updatedIncome },
        "ปฏิเสธรายรับแล้ว"
      );
    },
    { permission: "incomes:approve" }
  )(request);
};
