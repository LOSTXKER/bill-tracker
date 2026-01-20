/**
 * POST /api/incomes/[id]/approve
 * Approve an income that is pending approval
 */

import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyApprovalGranted } from "@/lib/notifications/line-messaging";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withCompanyAccess(
    async (req, { company, session }) => {
      const { id } = await routeParams.params;

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

      // Only PENDING can be approved
      if (income.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถอนุมัติได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      // Prevent self-approval
      if (income.submittedBy === session.user.id) {
        return apiResponse.badRequest("ไม่สามารถอนุมัติคำขอของตัวเองได้");
      }

      // Update the income
      const updatedIncome = await prisma.income.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
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
          eventType: "APPROVED",
          createdBy: session.user.id,
          notes: "อนุมัติรายรับ",
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "APPROVE",
        entityType: "Income",
        entityId: id,
        description: `อนุมัติรายรับ: ${income.source || "ไม่ระบุ"} จำนวน ${income.netReceived} บาท`,
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
          entityId: id,
          title: "รายรับได้รับการอนุมัติ",
          message: `รายรับ "${income.source || "ไม่ระบุ"}" ได้รับการอนุมัติโดย ${session.user.name}`,
          actorId: session.user.id,
          actorName: session.user.name,
        });
      }

      // Send LINE notification
      const submitter = income.submittedBy 
        ? await prisma.user.findUnique({ where: { id: income.submittedBy }, select: { name: true } })
        : null;
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";
      
      await notifyApprovalGranted(company.id, {
        id,
        companyCode: company.code.toLowerCase(),
        companyName: company.name,
        type: "income",
        description: income.source || undefined,
        vendorOrCustomer: income.Contact?.name || undefined,
        amount: Number(income.netReceived),
        submitterName: submitter?.name || "ไม่ระบุ",
        approverName: session.user.name || undefined,
      }, baseUrl);

      return apiResponse.success(
        { income: updatedIncome },
        "อนุมัติรายรับแล้ว"
      );
    },
    { permission: "incomes:approve" }
  )(request);
};
