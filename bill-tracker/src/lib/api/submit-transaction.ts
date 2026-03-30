/**
 * Shared handler for submitting a transaction for approval (or direct activation).
 * Used by both expenses/[id]/submit and incomes/[id]/submit.
 */

import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyApprovalRequest } from "@/lib/notifications/line-messaging";
import { getBaseUrl } from "@/lib/utils/get-base-url";

interface SubmitTransactionConfig {
  model: "expense" | "income";
  entityType: "Expense" | "Income";
  type: "expense" | "income";
  permissionModule: "expenses" | "incomes";
  notFoundMessage: string;
  noPermissionMessage: string;
  descriptionField: "description" | "source";
  amountField: "netPaid" | "netReceived";
  eventIdField: "expenseId" | "incomeId";
  responseKey: "expense" | "income";
  directSuccessNote: string;
  directSuccessMessage: string;
  approvalSubmitNote: string;
  approvalAuditDescription: string;
  approvalNotificationTitle: string;
  approvalNotificationPrefix: string;
  approvalSuccessMessage: string;
}

export const SUBMIT_EXPENSE_CONFIG: SubmitTransactionConfig = {
  model: "expense",
  entityType: "Expense",
  type: "expense",
  permissionModule: "expenses",
  notFoundMessage: "ไม่พบรายจ่าย",
  noPermissionMessage: "คุณไม่มีสิทธิ์สร้างรายจ่าย",
  descriptionField: "description",
  amountField: "netPaid",
  eventIdField: "expenseId",
  responseKey: "expense",
  directSuccessNote: "ส่งและบันทึกจ่ายเงินแล้ว (ไม่ต้องอนุมัติ)",
  directSuccessMessage: "บันทึกจ่ายเงินแล้ว",
  approvalSubmitNote: "ส่งคำขออนุมัติ",
  approvalAuditDescription: "ส่งคำขออนุมัติรายจ่าย",
  approvalNotificationTitle: "คำขออนุมัติรายจ่ายใหม่",
  approvalNotificationPrefix: "ส่งคำขออนุมัติรายจ่าย",
  approvalSuccessMessage: "ส่งคำขออนุมัติแล้ว",
};

export const SUBMIT_INCOME_CONFIG: SubmitTransactionConfig = {
  model: "income",
  entityType: "Income",
  type: "income",
  permissionModule: "incomes",
  notFoundMessage: "ไม่พบรายรับ",
  noPermissionMessage: "คุณไม่มีสิทธิ์สร้างรายรับ",
  descriptionField: "source",
  amountField: "netReceived",
  eventIdField: "incomeId",
  responseKey: "income",
  directSuccessNote: "ส่งและบันทึกรับเงินแล้ว (ไม่ต้องอนุมัติ)",
  directSuccessMessage: "บันทึกรับเงินแล้ว",
  approvalSubmitNote: "ส่งคำขออนุมัติ",
  approvalAuditDescription: "ส่งคำขออนุมัติรายรับ",
  approvalNotificationTitle: "คำขออนุมัติรายรับใหม่",
  approvalNotificationPrefix: "ส่งคำขออนุมัติรายรับ",
  approvalSuccessMessage: "ส่งคำขออนุมัติแล้ว",
};

export async function handleSubmitTransaction(
  config: SubmitTransactionConfig,
  id: string,
  userId: string,
  userName: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[config.model];

  const transaction = await model.findFirst({
    where: { id, deletedAt: null },
    include: { Contact: true, Company: true },
  });

  if (!transaction) {
    return apiResponse.notFound(config.notFoundMessage);
  }

  const company = transaction.Company;
  if (!company) {
    return apiResponse.badRequest("ไม่พบข้อมูลบริษัท");
  }

  const access = await prisma.companyAccess.findUnique({
    where: { userId_companyId: { userId, companyId: company.id } },
  });

  if (!access) {
    return apiResponse.forbidden("คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้");
  }

  const permissions = (access.permissions as string[]) || [];
  const mod = config.permissionModule;
  const hasCreatePermission = access.isOwner ||
    permissions.includes(`${mod}:create`) ||
    permissions.includes(`${mod}:*`);

  if (!hasCreatePermission) {
    return apiResponse.forbidden(config.noPermissionMessage);
  }

  const currentWorkflowStatus = transaction.workflowStatus;
  if (currentWorkflowStatus !== "DRAFT" && currentWorkflowStatus !== null) {
    return apiResponse.badRequest(
      `สามารถส่งได้เฉพาะรายการร่างเท่านั้น (สถานะปัจจุบัน: ${currentWorkflowStatus})`
    );
  }

  if (transaction.approvalStatus === "REJECTED") {
    await model.update({ where: { id }, data: { rejectedReason: null } });
  }

  const desc = transaction[config.descriptionField] || "ไม่ระบุ";
  const canCreateDirect = access.isOwner ||
    permissions.includes(`${mod}:create-direct`) ||
    permissions.includes(`${mod}:*`);

  if (canCreateDirect) {
    const updated = await model.update({
      where: { id },
      data: { workflowStatus: "ACTIVE", approvalStatus: "NOT_REQUIRED", updatedAt: new Date() },
      include: { Contact: true, Account: true },
    });

    await prisma.documentEvent.create({
      data: {
        id: crypto.randomUUID(),
        [config.eventIdField]: id,
        eventType: "MARKED_AS_PAID",
        fromStatus: "DRAFT",
        toStatus: "ACTIVE",
        createdBy: userId,
        notes: config.directSuccessNote,
      },
    });

    await createAuditLog({
      userId,
      companyId: company.id,
      action: "STATUS_CHANGE",
      entityType: config.entityType,
      entityId: id,
      description: `${config.directSuccessMessage}: ${desc}`,
      changes: { before: { workflowStatus: "DRAFT" }, after: { workflowStatus: "ACTIVE" } },
    });

    return apiResponse.success({ [config.responseKey]: updated }, config.directSuccessMessage);
  }

  // Approval flow
  const updated = await model.update({
    where: { id },
    data: {
      workflowStatus: "PENDING_APPROVAL",
      approvalStatus: "PENDING",
      submittedAt: new Date(),
      submittedBy: userId,
      updatedAt: new Date(),
    },
    include: { Contact: true, Account: true },
  });

  await prisma.documentEvent.create({
    data: {
      id: crypto.randomUUID(),
      [config.eventIdField]: id,
      eventType: "SUBMITTED_FOR_APPROVAL",
      createdBy: userId,
      notes: config.approvalSubmitNote,
    },
  });

  await createAuditLog({
    userId,
    companyId: company.id,
    action: "STATUS_CHANGE",
    entityType: config.entityType,
    entityId: id,
    description: `${config.approvalAuditDescription}: ${desc}`,
    changes: { before: { workflowStatus: "DRAFT" }, after: { workflowStatus: "PENDING_APPROVAL" } },
  });

  const approvers = await prisma.companyAccess.findMany({
    where: {
      companyId: company.id,
      OR: [
        { isOwner: true },
        { permissions: { array_contains: [`${mod}:approve`] } },
        { permissions: { array_contains: [`${mod}:*`] } },
      ],
    },
    select: { userId: true },
  });

  if (approvers.length > 0) {
    await createNotification({
      companyId: company.id,
      targetUserIds: approvers.map((a) => a.userId),
      type: "TRANSACTION_SUBMITTED",
      entityType: config.entityType,
      entityId: id,
      title: config.approvalNotificationTitle,
      message: `${userName} ${config.approvalNotificationPrefix}: ${desc} จำนวน ${transaction[config.amountField]} บาท`,
      actorId: userId,
      actorName: userName,
    });
  }

  await notifyApprovalRequest(company.id, {
    id,
    companyCode: company.code.toLowerCase(),
    companyName: company.name,
    type: config.type,
    description: transaction[config.descriptionField] || undefined,
    vendorOrCustomer: transaction.Contact?.name || undefined,
    amount: Number(transaction[config.amountField]),
    submitterName: userName || "ไม่ระบุ",
  }, getBaseUrl());

  return apiResponse.success({ [config.responseKey]: updated }, config.approvalSuccessMessage);
}
