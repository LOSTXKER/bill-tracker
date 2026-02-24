/**
 * Shared Transaction Approval/Rejection Logic
 * Eliminates duplication between expense and income approve/reject routes.
 */

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { withAuth } from "./with-auth";
import { apiResponse } from "./response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyApprovalGranted, notifyRejection } from "@/lib/notifications/line-messaging";
import { getBaseUrl } from "@/lib/utils/get-base-url";

interface TransactionApprovalConfig {
  type: "expense" | "income";
  entityName: string;
  displayName: string;
  permission: string;
  descriptionField: string;
  netAmountField: string;
  submittedByField: string;
  eventIdField: "expenseId" | "incomeId";
  responseKey: string;
}

const EXPENSE_CONFIG: TransactionApprovalConfig = {
  type: "expense",
  entityName: "Expense",
  displayName: "รายจ่าย",
  permission: "expenses:approve",
  descriptionField: "description",
  netAmountField: "netPaid",
  submittedByField: "submittedBy",
  eventIdField: "expenseId",
  responseKey: "expense",
};

const INCOME_CONFIG: TransactionApprovalConfig = {
  type: "income",
  entityName: "Income",
  displayName: "รายรับ",
  permission: "incomes:approve",
  descriptionField: "source",
  netAmountField: "netReceived",
  submittedByField: "submittedBy",
  eventIdField: "incomeId",
  responseKey: "income",
};

export function getApprovalConfig(type: "expense" | "income"): TransactionApprovalConfig {
  return type === "expense" ? EXPENSE_CONFIG : INCOME_CONFIG;
}

function getPrismaModel(type: "expense" | "income") {
  return type === "expense" ? prisma.expense : prisma.income;
}

export function createTransactionApproveHandler(type: "expense" | "income") {
  const config = getApprovalConfig(type);

  return (request: Request, routeParams: { params: Promise<{ id: string }> }) => {
    return withAuth(async (req, { session }) => {
      const { id } = await routeParams.params;
      const model = getPrismaModel(type);

      const entity = await (model as any).findFirst({
        where: { id, deletedAt: null },
        include: { Contact: true, Company: true },
      });

      if (!entity) {
        return apiResponse.notFound(`ไม่พบ${config.displayName}`);
      }

      const company = entity.Company;
      if (!company) {
        return apiResponse.badRequest("ไม่พบข้อมูลบริษัท");
      }

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

      const permissions = (access.permissions as string[]) || [];
      const canApprove = access.isOwner ||
        permissions.includes(config.permission) ||
        permissions.includes(`${config.type}s:*`);

      if (!canApprove) {
        return apiResponse.forbidden(`คุณไม่มีสิทธิ์อนุมัติ${config.displayName}`);
      }

      if (entity.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถอนุมัติได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      if (entity[config.submittedByField] === session.user.id) {
        return apiResponse.badRequest("ไม่สามารถอนุมัติคำขอของตัวเองได้");
      }

      const updated = await (model as any).update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        include: { Contact: true, Account: true },
      });

      await prisma.documentEvent.create({
        data: {
          id: crypto.randomUUID(),
          [config.eventIdField]: id,
          eventType: "APPROVED",
          createdBy: session.user.id,
          notes: `อนุมัติ${config.displayName}`,
        },
      });

      const description = entity[config.descriptionField] || "ไม่ระบุ";
      const amount = entity[config.netAmountField];

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "APPROVE",
        entityType: config.entityName,
        entityId: id,
        description: `อนุมัติ${config.displayName}: ${description} จำนวน ${amount} บาท`,
        changes: {
          before: { approvalStatus: "PENDING" },
          after: { approvalStatus: "APPROVED" },
        },
      });

      if (entity.createdBy) {
        await createNotification({
          companyId: company.id,
          targetUserIds: [entity.createdBy],
          type: "TRANSACTION_APPROVED",
          entityType: config.entityName,
          entityId: id,
          title: `${config.displayName}ได้รับการอนุมัติ`,
          message: `${config.displayName} "${description}" ได้รับการอนุมัติโดย ${session.user.name}`,
          actorId: session.user.id,
          actorName: session.user.name,
        });
      }

      const submitter = entity[config.submittedByField]
        ? await prisma.user.findUnique({ where: { id: entity[config.submittedByField] }, select: { name: true } })
        : null;

      await notifyApprovalGranted(company.id, {
        id,
        companyCode: company.code.toLowerCase(),
        companyName: company.name,
        type: config.type,
        description: description !== "ไม่ระบุ" ? description : undefined,
        vendorOrCustomer: entity.Contact?.name || undefined,
        amount: Number(amount),
        submitterName: submitter?.name || "ไม่ระบุ",
        approverName: session.user.name || undefined,
      }, getBaseUrl());

      // Bust stats cache so dashboard reflects the approval immediately
      if (config.type === "expense") revalidateTag("expense-stats", {});
      if (config.type === "income") revalidateTag("income-stats", {});

      return apiResponse.success(
        { [config.responseKey]: updated },
        `อนุมัติ${config.displayName}แล้ว`
      );
    })(request);
  };
}

export function createTransactionRejectHandler(type: "expense" | "income") {
  const config = getApprovalConfig(type);

  return (request: Request, routeParams: { params: Promise<{ id: string }> }) => {
    return withAuth(async (req, { session }) => {
      const { id } = await routeParams.params;
      const body = await req.json();
      const { reason } = body;

      if (!reason || reason.trim() === "") {
        return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
      }

      const model = getPrismaModel(type);

      const entity = await (model as any).findFirst({
        where: { id, deletedAt: null },
        include: { Contact: true, Company: true },
      });

      if (!entity) {
        return apiResponse.notFound(`ไม่พบ${config.displayName}`);
      }

      const company = entity.Company;
      if (!company) {
        return apiResponse.badRequest("ไม่พบข้อมูลบริษัท");
      }

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

      const permissions = (access.permissions as string[]) || [];
      const canApprove = access.isOwner ||
        permissions.includes(config.permission) ||
        permissions.includes(`${config.type}s:*`);

      if (!canApprove) {
        return apiResponse.forbidden(`คุณไม่มีสิทธิ์ปฏิเสธ${config.displayName}`);
      }

      if (entity.approvalStatus !== "PENDING") {
        return apiResponse.badRequest("สามารถปฏิเสธได้เฉพาะรายการที่รออนุมัติเท่านั้น");
      }

      const updated = await (model as any).update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
          rejectedReason: reason.trim(),
          approvedBy: session.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        include: { Contact: true, Account: true },
      });

      await prisma.documentEvent.create({
        data: {
          id: crypto.randomUUID(),
          [config.eventIdField]: id,
          eventType: "REJECTED",
          createdBy: session.user.id,
          notes: `ปฏิเสธ${config.displayName}: ${reason.trim()}`,
        },
      });

      const description = entity[config.descriptionField] || "ไม่ระบุ";

      await createAuditLog({
        userId: session.user.id,
        companyId: company.id,
        action: "STATUS_CHANGE",
        entityType: config.entityName,
        entityId: id,
        description: `ปฏิเสธ${config.displayName}: ${description} เหตุผล: ${reason.trim()}`,
        changes: {
          before: { approvalStatus: "PENDING" },
          after: { approvalStatus: "REJECTED", rejectedReason: reason.trim() },
        },
      });

      if (entity.createdBy) {
        await createNotification({
          companyId: company.id,
          targetUserIds: [entity.createdBy],
          type: "TRANSACTION_REJECTED",
          entityType: config.entityName,
          entityId: id,
          title: `${config.displayName}ถูกปฏิเสธ`,
          message: `${config.displayName} "${description}" ถูกปฏิเสธโดย ${session.user.name}: ${reason.trim()}`,
          actorId: session.user.id,
          actorName: session.user.name,
          metadata: { reason: reason.trim() },
        });
      }

      const submitter = entity[config.submittedByField]
        ? await prisma.user.findUnique({ where: { id: entity[config.submittedByField] }, select: { name: true } })
        : null;

      await notifyRejection(company.id, {
        id,
        companyCode: company.code.toLowerCase(),
        companyName: company.name,
        type: config.type,
        description: description !== "ไม่ระบุ" ? description : undefined,
        vendorOrCustomer: entity.Contact?.name || undefined,
        amount: Number(entity[config.netAmountField]),
        submitterName: submitter?.name || "ไม่ระบุ",
        approverName: session.user.name || undefined,
        rejectedReason: reason.trim(),
      }, getBaseUrl());

      // Bust stats cache so dashboard reflects the rejection immediately
      if (config.type === "expense") revalidateTag("expense-stats", {});
      if (config.type === "income") revalidateTag("income-stats", {});

      return apiResponse.success(
        { [config.responseKey]: updated },
        `ปฏิเสธ${config.displayName}แล้ว`
      );
    })(request);
  };
}
