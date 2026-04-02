import { randomUUID } from "crypto";
import type { Expense } from "@prisma/client";
import { validateExpenseWhtChange } from "@/lib/validations/wht-validator";
import type { TransactionRequestBody } from "../transaction-types";

export function deduplicatePayers<T extends { paidByType: string; paidByUserId?: string | null; paidByPettyCashFundId?: string | null; amount: number }>(payers: T[]): T[] {
  const seen = new Map<string, T>();
  for (const payer of payers) {
    let key: string;
    if (payer.paidByType === "USER" && payer.paidByUserId) {
      key = `USER:${payer.paidByUserId}`;
    } else if (payer.paidByType === "PETTY_CASH" && payer.paidByPettyCashFundId) {
      key = `PETTY_CASH:${payer.paidByPettyCashFundId}`;
    } else if (payer.paidByType === "COMPANY") {
      key = `COMPANY:${payer.amount}`;
    } else {
      key = `${payer.paidByType}:${payer.paidByUserId || ""}:${payer.amount}`;
    }
    if (!seen.has(key)) {
      seen.set(key, payer);
    }
  }
  return Array.from(seen.values());
}

export function transformExpenseCreateData(body: TransactionRequestBody) {
  const { vatAmount, whtAmount, netPaid, ...data } = body;

  const isWht = data.isWht || false;
  const hasTaxInvoice = (data.taxInvoiceUrls?.length || 0) > 0;
  const workflowStatus = "DRAFT";

  return {
    id: randomUUID(),
    updatedAt: new Date(),
    contactId: data.contactId || null,
    contactName: data.contactName || null,
    amount: data.amount,
    vatRate: data.vatRate || 0,
    vatAmount: vatAmount || null,
    isWht: isWht,
    whtRate: data.whtRate || null,
    whtAmount: whtAmount || null,
    whtType: data.whtType || null,
    netPaid: netPaid,
    description: data.description,
    accountId: data.accountId || null,
    internalCompanyId: data.internalCompanyId || null,
    invoiceNumber: data.invoiceNumber,
    referenceNo: data.referenceNo,
    billDate: data.billDate ? new Date(data.billDate) : new Date(),
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    workflowStatus: workflowStatus,
    documentType: data.documentType || "TAX_INVOICE",
    hasTaxInvoice: hasTaxInvoice,
    ...(hasTaxInvoice ? { taxInvoiceAt: new Date(), taxInvoiceRequestedAt: new Date() } : {}),
    hasWhtCert: (data.whtCertUrls?.length || 0) > 0,
    notes: data.notes,
    slipUrls: data.slipUrls || [],
    taxInvoiceUrls: data.taxInvoiceUrls || [],
    whtCertUrls: data.whtCertUrls || [],
    otherDocUrls: data.otherDocUrls || [],
    referenceUrls: data.referenceUrls || [],
    whtDeliveryMethod: data.whtDeliveryMethod || null,
    whtDeliveryEmail: data.whtDeliveryEmail || null,
    whtDeliveryNotes: data.whtDeliveryNotes || null,
    taxInvoiceRequestMethod: data.taxInvoiceRequestMethod || null,
    taxInvoiceRequestEmail: data.taxInvoiceRequestEmail || null,
    taxInvoiceRequestNotes: data.taxInvoiceRequestNotes || null,
    originalCurrency: data.originalCurrency || null,
    originalAmount: data.originalAmount || null,
    exchangeRate: data.exchangeRate || null,
  };
}

interface ExpenseUpdateAccumulator {
  [key: string]: unknown;
  hasTaxInvoice?: boolean;
  hasWhtCert?: boolean;
  taxInvoiceAt?: Date;
  workflowStatus?: string;
  notes?: string;
  _whtChangeConfirmed?: boolean;
  _whtChangeReason?: string;
}

export function transformExpenseUpdateData(body: TransactionRequestBody, existingData?: Expense) {
  const { vatAmount, whtAmount, netPaid, ...data } = body;
  const updateData: ExpenseUpdateAccumulator = {};

  if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
  if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
  if (vatAmount !== undefined) updateData.vatAmount = vatAmount;
  if (data.isWht !== undefined) updateData.isWht = data.isWht;
  if (data.whtRate !== undefined) updateData.whtRate = data.whtRate;
  if (whtAmount !== undefined) updateData.whtAmount = whtAmount;
  if (data.whtType !== undefined) updateData.whtType = data.whtType;
  if (netPaid !== undefined) updateData.netPaid = netPaid;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.accountId !== undefined) updateData.accountId = data.accountId || null;
  if (data.internalCompanyId !== undefined) updateData.internalCompanyId = data.internalCompanyId || null;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
  if (data.billDate !== undefined) updateData.billDate = data.billDate ? new Date(data.billDate) : undefined;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.workflowStatus !== undefined) updateData.workflowStatus = data.workflowStatus;
  if (data.documentType !== undefined) updateData.documentType = data.documentType;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (data.slipUrls !== undefined) updateData.slipUrls = data.slipUrls;
  if (data.taxInvoiceUrls !== undefined) {
    updateData.taxInvoiceUrls = data.taxInvoiceUrls;
    updateData.hasTaxInvoice = data.taxInvoiceUrls.length > 0;
    if (data.taxInvoiceUrls.length > 0 && !updateData.taxInvoiceAt) {
      updateData.taxInvoiceAt = new Date();
    }
  }
  if (data.whtCertUrls !== undefined) {
    updateData.whtCertUrls = data.whtCertUrls;
    updateData.hasWhtCert = data.whtCertUrls.length > 0;
  }
  if (data.referenceUrls !== undefined) {
    updateData.referenceUrls = data.referenceUrls;
  }
  if (data.otherDocUrls !== undefined) {
    updateData.otherDocUrls = data.otherDocUrls;
  }

  if (data.whtDeliveryMethod !== undefined) updateData.whtDeliveryMethod = data.whtDeliveryMethod || null;
  if (data.whtDeliveryEmail !== undefined) updateData.whtDeliveryEmail = data.whtDeliveryEmail || null;
  if (data.whtDeliveryNotes !== undefined) updateData.whtDeliveryNotes = data.whtDeliveryNotes || null;
  if (data.taxInvoiceRequestMethod !== undefined) updateData.taxInvoiceRequestMethod = data.taxInvoiceRequestMethod || null;
  if (data.taxInvoiceRequestEmail !== undefined) updateData.taxInvoiceRequestEmail = data.taxInvoiceRequestEmail || null;
  if (data.taxInvoiceRequestNotes !== undefined) updateData.taxInvoiceRequestNotes = data.taxInvoiceRequestNotes || null;
  if (data.originalCurrency !== undefined) updateData.originalCurrency = data.originalCurrency || null;
  if (data.originalAmount !== undefined) updateData.originalAmount = data.originalAmount || null;
  if (data.exchangeRate !== undefined) updateData.exchangeRate = data.exchangeRate || null;

  if (existingData && data.isWht !== undefined && data.isWht !== existingData.isWht) {
    const wasWht = existingData.isWht;
    const nowWht = data.isWht;
    const currentStatus = existingData.workflowStatus;
    const hasTaxInvoice = updateData.hasTaxInvoice ?? existingData.hasTaxInvoice;
    const hasWhtCert = updateData.hasWhtCert ?? existingData.hasWhtCert;

    const validation = validateExpenseWhtChange(currentStatus, wasWht, nowWht, hasWhtCert);

    if (!validation.allowed) {
      throw new Error(validation.message || "ไม่สามารถเปลี่ยนสถานะหัก ณ ที่จ่ายได้");
    }

    if (validation.requiresConfirmation && !data._whtChangeConfirmed) {
      throw new Error(JSON.stringify({
        code: "WHT_CHANGE_REQUIRES_CONFIRMATION",
        message: validation.message,
        rollbackStatus: validation.rollbackStatus,
      }));
    }

    if (validation.rollbackStatus) {
      updateData.workflowStatus = validation.rollbackStatus;
    } else {
      if (!wasWht && nowWht) {
        if (currentStatus === "READY_FOR_ACCOUNTING") {
          if (!hasWhtCert) {
            updateData.workflowStatus = "ACTIVE";
          }
        }
      } else if (wasWht && !nowWht) {
        if (currentStatus === "ACTIVE" && hasTaxInvoice) {
          updateData.workflowStatus = "READY_FOR_ACCOUNTING";
        }
      }
    }

    if (data._whtChangeReason) {
      updateData.notes = existingData.notes
        ? `${existingData.notes}\n\n[WHT เปลี่ยน: ${data._whtChangeReason}]`
        : `[WHT เปลี่ยน: ${data._whtChangeReason}]`;
    }
  }

  delete updateData._whtChangeConfirmed;
  delete updateData._whtChangeReason;

  return updateData;
}
