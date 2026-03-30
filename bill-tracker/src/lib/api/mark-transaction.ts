/**
 * Shared handler for marking a transaction as paid/received (DRAFT → ACTIVE).
 * Used by both expenses/[id]/mark-paid and incomes/[id]/mark-received.
 */

import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

interface MarkTransactionConfig {
  model: "expense" | "income";
  entityType: "Expense" | "Income";
  notFoundMessage: string;
  cannotMarkMessage: string;
  successNote: string;
  successMessage: string;
  descriptionField: "description" | "source";
  eventIdField: "expenseId" | "incomeId";
  responseKey: "expense" | "income";
}

export const MARK_EXPENSE_CONFIG: MarkTransactionConfig = {
  model: "expense",
  entityType: "Expense",
  notFoundMessage: "ไม่พบรายจ่าย",
  cannotMarkMessage: "ไม่สามารถบันทึกจ่ายเงินได้ในสถานะนี้",
  successNote: "บันทึกจ่ายเงินแล้ว",
  successMessage: "บันทึกจ่ายเงินแล้ว",
  descriptionField: "description",
  eventIdField: "expenseId",
  responseKey: "expense",
};

export const MARK_INCOME_CONFIG: MarkTransactionConfig = {
  model: "income",
  entityType: "Income",
  notFoundMessage: "ไม่พบรายรับ",
  cannotMarkMessage: "ไม่สามารถบันทึกรับเงินได้ในสถานะนี้",
  successNote: "บันทึกรับเงินแล้ว",
  successMessage: "บันทึกรับเงินแล้ว",
  descriptionField: "source",
  eventIdField: "incomeId",
  responseKey: "income",
};

export async function handleMarkTransaction(
  config: MarkTransactionConfig,
  id: string,
  companyId: string,
  userId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[config.model];

  const transaction = await model.findFirst({
    where: { id, companyId, deletedAt: null },
    include: { Contact: true },
  });

  if (!transaction) {
    return apiResponse.notFound(config.notFoundMessage);
  }

  const canMark =
    transaction.workflowStatus === "DRAFT" &&
    (transaction.approvalStatus === "NOT_REQUIRED" ||
      transaction.approvalStatus === "APPROVED");

  if (!canMark) {
    if (transaction.workflowStatus === "PENDING_APPROVAL") {
      return apiResponse.badRequest("รายการนี้ยังรออนุมัติอยู่");
    }
    if (transaction.approvalStatus === "REJECTED") {
      return apiResponse.badRequest("รายการนี้ถูกปฏิเสธ กรุณาแก้ไขและส่งใหม่");
    }
    if (transaction.workflowStatus !== "DRAFT") {
      return apiResponse.badRequest("รายการนี้ไม่อยู่ในสถานะร่าง");
    }
    return apiResponse.badRequest(config.cannotMarkMessage);
  }

  const updated = await model.update({
    where: { id },
    data: { workflowStatus: "ACTIVE", updatedAt: new Date() },
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
      notes: config.successNote,
    },
  });

  await createAuditLog({
    userId,
    companyId,
    action: "STATUS_CHANGE",
    entityType: config.entityType,
    entityId: id,
    description: `${config.successNote}: ${transaction[config.descriptionField] || "ไม่ระบุ"}`,
    changes: {
      before: { workflowStatus: "DRAFT" },
      after: { workflowStatus: "ACTIVE" },
    },
  });

  return apiResponse.success(
    { [config.responseKey]: updated },
    config.successMessage,
  );
}
