/**
 * POST /api/expenses/[id]/approve
 * Approve an expense that is pending approval
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyApprovalGranted } from "@/lib/notifications/line-messaging";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (req, { session }) => {
      const { id } = await routeParams.params;

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
        return apiResponse.forbidden("คุณไม่มีสิทธิ์อนุมัติรายจ่าย");
      }

      // Only PENDING can be approved
      if (expense.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถอนุมัติได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      // Prevent self-approval
      if (expense.submittedBy === session.user.id) {
        return apiResponse.badRequest("ไม่สามารถอนุมัติคำขอของตัวเองได้");
      }

      // Update the expense
      const updatedExpense = await prisma.expense.update({
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
          expenseId: id,
          eventType: "APPROVED",
          createdBy: session.user.id,
          notes: "อนุมัติรายจ่าย",
        },
      });

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "APPROVE",
        entityType: "Expense",
        entityId: id,
        description: `อนุมัติรายจ่าย: ${expense.description || "ไม่ระบุ"} จำนวน ${expense.netPaid} บาท`,
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
          entityId: id,
          title: "รายจ่ายได้รับการอนุมัติ",
          message: `รายจ่าย "${expense.description || "ไม่ระบุ"}" ได้รับการอนุมัติโดย ${session.user.name}`,
          actorId: session.user.id,
          actorName: session.user.name,
        });
      }

      // Send LINE notification
      const submitter = expense.submittedBy 
        ? await prisma.user.findUnique({ where: { id: expense.submittedBy }, select: { name: true } })
        : null;
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";
      
      await notifyApprovalGranted(company.id, {
        id,
        companyCode: company.code.toLowerCase(),
        companyName: company.name,
        type: "expense",
        description: expense.description || undefined,
        vendorOrCustomer: expense.Contact?.name || undefined,
        amount: Number(expense.netPaid),
        submitterName: submitter?.name || "ไม่ระบุ",
        approverName: session.user.name || undefined,
      }, baseUrl);

      return apiResponse.success(
        { expense: updatedExpense },
        "อนุมัติรายจ่ายแล้ว"
      );
    }
  )(request);
};
