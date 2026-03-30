/**
 * Income Transaction Strategy
 * 
 * Implementation of transaction strategy for income transactions.
 */

import { BaseTransactionStrategy, type ValidationResult } from "./base";
import type { TransactionFieldMapping, TransactionPermissions, TransactionLabels, WorkflowStatus } from "./base";

export class IncomeStrategy extends BaseTransactionStrategy {
  readonly type = "income" as const;

  readonly labels: TransactionLabels = {
    singular: "รายรับ",
    plural: "รายรับ",
    singularEn: "Income",
    pluralEn: "Incomes",
    dateLabel: "วันที่รับเงิน",
    amountLabel: "ยอดรับสุทธิ",
    contactLabel: "ลูกค้า",
    whtLabel: "ถูกหัก ณ ที่จ่าย (ลูกค้าหัก)",
    descriptionLabel: "แหล่งรายได้",
  };

  readonly fields: TransactionFieldMapping = {
    dateField: "receiveDate",
    netAmountField: "netReceived",
    whtFlagField: "isWhtDeducted",
    descriptionField: "source",
    contactField: "Contact",
    workflowStatusField: "workflowStatus",
    hasDocumentField: "hasInvoice",
  };

  readonly permissions: TransactionPermissions = {
    read: "incomes:read",
    create: "incomes:create",
    update: "incomes:update",
    delete: "incomes:delete",
    approve: "incomes:approve",
    createDirect: "incomes:create-direct",
  };

  readonly workflowStatuses: WorkflowStatus[] = [
    { value: "DRAFT", label: "ร่าง", description: "รายการร่าง ยังไม่ส่ง", color: "slate" },
    { value: "PENDING_APPROVAL", label: "รออนุมัติ", description: "ส่งแล้ว รอคนอนุมัติ", color: "amber" },
    { value: "ACTIVE", label: "ดำเนินการ", description: "รับเงินแล้ว กำลังจัดการเอกสาร", color: "blue" },
    { value: "READY_FOR_ACCOUNTING", label: "พร้อมส่งบัญชี", description: "เอกสารครบ พร้อมส่งบัญชี", color: "indigo" },
    { value: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", description: "ส่งให้บัญชีแล้ว", color: "emerald" },
    { value: "COMPLETED", label: "เสร็จสิ้น", description: "ดำเนินการเสร็จสิ้น", color: "emerald" },
  ];

  validateCreate(data: Record<string, unknown>): ValidationResult {
    const baseValidation = super.validateCreate(data);
    if (!baseValidation.valid) return baseValidation;

    const errors: string[] = [];

    // Income-specific validation
    if (data.isWhtDeducted && !data.whtRate) {
      errors.push("กรุณาระบุอัตราหัก ณ ที่จ่าย");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  transformCreateData(data: Record<string, unknown>): Record<string, unknown> {
    const { vatAmount, whtAmount, netReceived, ...rest } = data;

    return {
      ...rest,
      amount: data.amount,
      vatAmount: vatAmount || null,
      whtAmount: data.isWhtDeducted ? whtAmount : null,
      whtRate: data.isWhtDeducted ? data.whtRate : null,
      whtType: data.isWhtDeducted ? data.whtType : null,
      netReceived: netReceived || data.amount,
      receiveDate: data.receiveDate || new Date(),
      workflowStatus: data.workflowStatus || this.determineWorkflowStatus(data),
      approvalStatus: data.approvalStatus || "NOT_REQUIRED",
      hasInvoice: data.hasInvoice || false,
      isWhtDeducted: Boolean(data.isWhtDeducted),
    };
  }

  transformUpdateData(
    existingData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    // Only include fields that are present in the update data
    const allowedFields = [
      "amount",
      "vatAmount",
      "whtAmount",
      "whtRate",
      "whtType",
      "netReceived",
      "receiveDate",
      "source",
      "contactId",
      "accountId",
      "invoiceNumber",
      "paymentMethod",
      "hasInvoice",
      "isWhtDeducted",
      "workflowStatus",
      "customerSlipUrls",
      "myBillCopyUrls",
      "whtCertUrls",
      "otherDocUrls",
    ];

    for (const field of allowedFields) {
      if (field in data) {
        updates[field] = data[field];
      }
    }

    return updates;
  }

  determineWorkflowStatus(_data: Record<string, unknown>): string {
    return "ACTIVE";
  }

  getPrismaModel(): string {
    return "income";
  }

  getApiPath(): string {
    return "/api/incomes";
  }

  getUiPath(companyCode: string): string {
    return `/${companyCode.toLowerCase()}/incomes`;
  }

  getDetailPath(companyCode: string, transactionId: string): string {
    return `/${companyCode.toLowerCase()}/incomes/${transactionId}`;
  }

  getDisplayName(transaction: Record<string, unknown>): string {
    const contact = transaction.Contact as Record<string, unknown> | null;
    if (contact?.name) return String(contact.name);

    const source = transaction.source;
    return source ? String(source) : "ไม่ระบุ";
  }
}

// Export singleton instance
export const incomeStrategy = new IncomeStrategy();
