import { randomUUID } from "crypto";
import type { Income } from "@prisma/client";
import { validateIncomeWhtChange } from "@/lib/validations/wht-validator";
import type { TransactionRequestBody } from "../transaction-types";

export function transformIncomeCreateData(body: TransactionRequestBody) {
  const { vatAmount, whtAmount, netReceived, ...data } = body;

  const isWhtDeducted = data.isWhtDeducted || false;
  const hasInvoice = (data.myBillCopyUrls?.length || 0) > 0;
  const workflowStatus = "DRAFT";

  return {
    id: randomUUID(),
    updatedAt: new Date(),
    contactId: data.contactId || null,
    contactName: data.contactName || null,
    amount: data.amount,
    vatRate: data.vatRate || 0,
    vatAmount: vatAmount || null,
    isWhtDeducted: isWhtDeducted,
    whtRate: data.whtRate || null,
    whtAmount: whtAmount || null,
    whtType: data.whtType || null,
    netReceived: netReceived,
    source: data.source,
    accountId: data.accountId || null,
    invoiceNumber: data.invoiceNumber,
    referenceNo: data.referenceNo,
    receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
    workflowStatus: workflowStatus,
    hasInvoice: hasInvoice,
    hasWhtCert: (data.whtCertUrls?.length || 0) > 0,
    notes: data.notes,
    customerSlipUrls: data.customerSlipUrls || [],
    myBillCopyUrls: data.myBillCopyUrls || [],
    whtCertUrls: data.whtCertUrls || [],
    otherDocUrls: data.otherDocUrls || [],
    referenceUrls: data.referenceUrls || [],
    originalCurrency: data.originalCurrency || null,
    originalAmount: data.originalAmount || null,
    exchangeRate: data.exchangeRate || null,
  };
}

interface IncomeUpdateAccumulator {
  [key: string]: unknown;
  hasInvoice?: boolean;
  hasWhtCert?: boolean;
  invoiceIssuedAt?: Date;
  whtCertReceivedAt?: Date;
  workflowStatus?: string;
  notes?: string;
  _whtChangeConfirmed?: boolean;
  _whtChangeReason?: string;
}

export function transformIncomeUpdateData(body: TransactionRequestBody, existingData?: Income) {
  const { vatAmount, whtAmount, netReceived, ...data } = body;
  const updateData: IncomeUpdateAccumulator = {};

  if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
  if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
  if (vatAmount !== undefined) updateData.vatAmount = vatAmount;
  if (data.isWhtDeducted !== undefined) updateData.isWhtDeducted = data.isWhtDeducted;
  if (data.whtRate !== undefined) updateData.whtRate = data.whtRate;
  if (whtAmount !== undefined) updateData.whtAmount = whtAmount;
  if (data.whtType !== undefined) updateData.whtType = data.whtType;
  if (netReceived !== undefined) updateData.netReceived = netReceived;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.accountId !== undefined) updateData.accountId = data.accountId || null;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
  if (data.receiveDate !== undefined) updateData.receiveDate = data.receiveDate ? new Date(data.receiveDate) : undefined;
  if (data.workflowStatus !== undefined) updateData.workflowStatus = data.workflowStatus;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.originalCurrency !== undefined) updateData.originalCurrency = data.originalCurrency || null;
  if (data.originalAmount !== undefined) updateData.originalAmount = data.originalAmount || null;
  if (data.exchangeRate !== undefined) updateData.exchangeRate = data.exchangeRate || null;

  if (data.customerSlipUrls !== undefined) updateData.customerSlipUrls = data.customerSlipUrls;
  if (data.myBillCopyUrls !== undefined) {
    updateData.myBillCopyUrls = data.myBillCopyUrls;
    updateData.hasInvoice = data.myBillCopyUrls.length > 0;
    if (data.myBillCopyUrls.length > 0 && !updateData.invoiceIssuedAt) {
      updateData.invoiceIssuedAt = new Date();
    }
  }
  if (data.whtCertUrls !== undefined) {
    updateData.whtCertUrls = data.whtCertUrls;
    updateData.hasWhtCert = data.whtCertUrls.length > 0;
    if (data.whtCertUrls.length > 0 && !updateData.whtCertReceivedAt) {
      updateData.whtCertReceivedAt = new Date();
    }
  }
  if (data.referenceUrls !== undefined) {
    updateData.referenceUrls = data.referenceUrls;
  }
  if (data.otherDocUrls !== undefined) {
    updateData.otherDocUrls = data.otherDocUrls;
  }

  if (existingData && data.isWhtDeducted !== undefined && data.isWhtDeducted !== existingData.isWhtDeducted) {
    const wasWht = existingData.isWhtDeducted;
    const nowWht = data.isWhtDeducted;
    const currentStatus = existingData.workflowStatus;
    const hasInvoice = updateData.hasInvoice ?? existingData.hasInvoice;
    const hasWhtCert = updateData.hasWhtCert ?? existingData.hasWhtCert;

    const validation = validateIncomeWhtChange(currentStatus, wasWht, nowWht, hasWhtCert);

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
        if (currentStatus === "ACTIVE" && hasInvoice) {
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
