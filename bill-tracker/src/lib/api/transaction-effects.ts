import { revalidateTag } from "next/cache";
import { logCreate, logUpdate, logStatusChange, logDelete, logWhtChange } from "@/lib/audit/logger";
import { notifyTransactionChange } from "@/lib/notifications/in-app";
import { createDocumentEvent } from "./transaction-document-events";
import { createLogger } from "@/lib/utils/logger";
import type { TransactionRouteConfig, TransactionRequestBody, TransactionRecord } from "./transaction-types";
import type { Session } from "next-auth";
import type { Company } from "@prisma/client";

const log = createLogger("transaction-effects");

export function revalidateTransactionCache(modelName: string) {
  if (modelName === "expense") revalidateTag("expense-stats", {});
  if (modelName === "income") revalidateTag("income-stats", {});
}

export async function runCreateSideEffects<TModel>(params: {
  config: TransactionRouteConfig<TModel, unknown, unknown>;
  item: TransactionRecord;
  body: TransactionRequestBody;
  session: Session;
  company: Company;
  request: Request;
}) {
  const { config, item, body, session, company, request } = params;

  await logCreate(config.displayName, item, session.user.id, company.id);

  createDocumentEvent({
    expenseId: config.modelName === "expense" ? item.id : undefined,
    incomeId: config.modelName === "income" ? item.id : undefined,
    eventType: "CREATED",
    toStatus: item.workflowStatus || item.status,
    notes: null,
    createdBy: session.user.id,
  }).catch((e) => log.error("Failed to create document event", e));

  notifyTransactionChange({
    companyId: company.id,
    transactionType: config.modelName,
    transactionId: item.id,
    action: "created",
    actorId: session.user.id,
    actorName: session.user.name || "ผู้ใช้",
    transactionDescription: item.description ?? undefined,
    amount: Number(item[config.fields.netAmountField]),
  }).catch((error) => log.error("Failed to create in-app notification", error));

  if (config.notifyCreate) {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    config.notifyCreate(company.id, {
      id: item.id,
      companyCode: company.code,
      companyName: company.name,
      ...body,
      status: item.workflowStatus || item.status,
      workflowStatus: item.workflowStatus,
      amount: item.amount,
      vatAmount: item.vatAmount,
      netPaid: item.netPaid,
      netReceived: item.netReceived,
      isWht: item.isWht,
      isWhtDeducted: item.isWhtDeducted,
      whtRate: item.whtRate,
      whtAmount: item.whtAmount,
    }, baseUrl).catch((error) => log.error("Failed to send LINE notification", error));
  }

  revalidateTransactionCache(config.modelName);
}

export async function runUpdateSideEffects<TModel>(params: {
  config: TransactionRouteConfig<TModel, unknown, unknown>;
  item: TransactionRecord;
  body: TransactionRequestBody;
  existingItem: TransactionRecord;
  session: Session;
}) {
  const { config, item, body, existingItem, session } = params;

  // Audit logging
  const statusField = config.fields.statusField;
  const isStatusChange = body[statusField] && body[statusField] !== existingItem[statusField];

  const whtField = config.modelName === "expense" ? "isWht" : "isWhtDeducted";
  const wasWht = existingItem[whtField];
  const nowWht = item[whtField];
  const isWhtChange = wasWht !== nowWht;

  if (isWhtChange) {
    const statusRollback = existingItem.workflowStatus !== item.workflowStatus
      ? {
          from: String(existingItem.workflowStatus ?? ""),
          to: String(item.workflowStatus ?? ""),
        }
      : undefined;

    await logWhtChange(
      config.displayName as "Expense" | "Income",
      item.id,
      Boolean(wasWht),
      Boolean(nowWht),
      body._whtChangeReason,
      statusRollback,
      session.user.id,
      item.companyId,
      config.getEntityDisplayName?.(item as TModel)
    );
  } else if (isStatusChange) {
    await logStatusChange(
      config.displayName,
      item.id,
      String(existingItem[statusField] ?? ""),
      String(body[statusField] ?? ""),
      session.user.id,
      item.companyId,
      config.getEntityDisplayName?.(item as TModel)
    );
  } else {
    await logUpdate(
      config.displayName,
      item.id,
      existingItem,
      item,
      session.user.id,
      item.companyId
    );
  }

  // File change document events
  const fileFields = config.modelName === "expense"
    ? { slipUrls: "สลิปโอนเงิน", taxInvoiceUrls: "ใบกำกับภาษี", whtCertUrls: "ใบ 50 ทวิ" }
    : { customerSlipUrls: "สลิปลูกค้า", myBillCopyUrls: "สำเนาบิล", whtCertUrls: "ใบ 50 ทวิ" };

  for (const [field, label] of Object.entries(fileFields)) {
    const oldUrls = (existingItem[field] || []) as string[];
    const newUrls: string[] = (body[field] as string[] | undefined) || oldUrls;

    const addedUrls = newUrls.filter((url: string) => url && !oldUrls.includes(url));
    const removedUrls = oldUrls.filter((url: string) => url && !newUrls.includes(url));

    if (addedUrls.length > 0) {
      createDocumentEvent({
        expenseId: config.modelName === "expense" ? item.id : undefined,
        incomeId: config.modelName === "income" ? item.id : undefined,
        eventType: "FILE_UPLOADED",
        fromStatus: existingItem.workflowStatus,
        toStatus: item.workflowStatus,
        notes: `อัปโหลด${label} ${addedUrls.length} ไฟล์`,
        metadata: { fileType: field, addedUrls },
        createdBy: session.user.id,
      }).catch((e) => log.error("Failed to create file upload event", e));
    }

    if (removedUrls.length > 0) {
      createDocumentEvent({
        expenseId: config.modelName === "expense" ? item.id : undefined,
        incomeId: config.modelName === "income" ? item.id : undefined,
        eventType: "FILE_REMOVED",
        fromStatus: existingItem.workflowStatus,
        toStatus: item.workflowStatus,
        notes: `ลบ${label} ${removedUrls.length} ไฟล์`,
        metadata: { fileType: field, removedUrls },
        createdBy: session.user.id,
      }).catch((e) => log.error("Failed to create file removal event", e));
    }
  }

  // Changed fields for notification
  const changedFields: string[] = [];
  const fieldLabels: Record<string, string> = {
    amount: "ยอดเงิน",
    description: "รายละเอียด",
    contactId: "ผู้ติดต่อ",
    accountId: "หมวดหมู่",
    vatAmount: "VAT",
    whtAmount: "หัก ณ ที่จ่าย",
    paymentMethod: "วิธีชำระ",
    invoiceNumber: "เลขที่เอกสาร",
  };

  Object.keys(fieldLabels).forEach((field) => {
    if (body[field] !== undefined &&
        JSON.stringify(existingItem[field]) !== JSON.stringify(body[field])) {
      changedFields.push(fieldLabels[field]);
    }
  });

  notifyTransactionChange({
    companyId: item.companyId,
    transactionType: config.modelName,
    transactionId: item.id,
    action: isStatusChange ? "status_changed" : "updated",
    actorId: session.user.id,
    actorName: session.user.name || "ผู้ใช้",
    transactionDescription: item.description ?? undefined,
    amount: Number(item[config.fields.netAmountField]),
    oldStatus: isStatusChange ? String(existingItem[statusField] ?? "") : undefined,
    newStatus: isStatusChange ? String(body[statusField] ?? "") : undefined,
    changedFields: changedFields.length > 0 ? changedFields : undefined,
  }).catch((error) => log.error("Failed to create in-app notification", error));

  revalidateTransactionCache(config.modelName);
}

export async function runDeleteSideEffects<TModel>(params: {
  config: TransactionRouteConfig<TModel, unknown, unknown>;
  item: TransactionRecord;
  existingItem: TransactionRecord;
  session: Session;
}) {
  const { config, item, existingItem, session } = params;

  await logDelete(
    config.displayName,
    existingItem,
    session.user.id,
    item.companyId
  );

  notifyTransactionChange({
    companyId: item.companyId,
    transactionType: config.modelName,
    transactionId: item.id,
    action: "deleted",
    actorId: session.user.id,
    actorName: session.user.name || "ผู้ใช้",
    transactionDescription: existingItem.description ?? undefined,
    amount: Number(existingItem[config.fields.netAmountField]),
  }).catch((error) => log.error("Failed to create in-app notification", error));

  revalidateTransactionCache(config.modelName);
}
