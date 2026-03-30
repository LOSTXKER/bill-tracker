/**
 * Expense Transaction Strategy
 * 
 * Implementation of transaction strategy for expense transactions.
 */

import { BaseTransactionStrategy, type ValidationResult } from "./base";
import type { TransactionFieldMapping, TransactionPermissions, TransactionLabels, WorkflowStatus } from "./base";

export class ExpenseStrategy extends BaseTransactionStrategy {
  readonly type = "expense" as const;

  readonly labels: TransactionLabels = {
    singular: "รายจ่าย",
    plural: "รายจ่าย",
    singularEn: "Expense",
    pluralEn: "Expenses",
    dateLabel: "วันที่บิล",
    amountLabel: "ยอดจ่ายสุทธิ",
    contactLabel: "ผู้ขาย/ร้านค้า",
    whtLabel: "หัก ณ ที่จ่าย (เราหัก)",
    descriptionLabel: "รายละเอียด",
  };

  readonly fields: TransactionFieldMapping = {
    dateField: "billDate",
    netAmountField: "netPaid",
    whtFlagField: "isWht",
    descriptionField: "description",
    contactField: "Contact",
    workflowStatusField: "workflowStatus",
    hasDocumentField: "hasTaxInvoice",
  };

  readonly permissions: TransactionPermissions = {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
    delete: "expenses:delete",
    approve: "expenses:approve",
    createDirect: "expenses:create-direct",
  };

  readonly workflowStatuses: WorkflowStatus[] = [
    { value: "DRAFT", label: "ร่าง", description: "รายการร่าง ยังไม่ส่ง", color: "slate" },
    { value: "PENDING_APPROVAL", label: "รออนุมัติ", description: "ส่งแล้ว รอคนอนุมัติ", color: "amber" },
    { value: "ACTIVE", label: "ดำเนินการ", description: "จ่ายเงินแล้ว กำลังจัดการเอกสาร", color: "blue" },
    { value: "READY_FOR_ACCOUNTING", label: "พร้อมส่งบัญชี", description: "เอกสารครบ พร้อมส่งบัญชี", color: "indigo" },
    { value: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", description: "ส่งให้บัญชีแล้ว", color: "emerald" },
    { value: "COMPLETED", label: "เสร็จสิ้น", description: "ดำเนินการเสร็จสิ้น", color: "emerald" },
  ];

  validateCreate(data: Record<string, unknown>): ValidationResult {
    const baseValidation = super.validateCreate(data);
    if (!baseValidation.valid) return baseValidation;

    const errors: string[] = [];

    // Expense-specific validation
    if (data.isWht && !data.whtRate) {
      errors.push("กรุณาระบุอัตราหัก ณ ที่จ่าย");
    }

    // Payers validation (if present)
    const payers = data.payers as Array<{ amount: number }> | undefined;
    if (payers && payers.length > 0) {
      const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0);
      const netPaid = Number(data.netPaid) || 0;
      if (Math.abs(totalPaid - netPaid) > 0.01) {
        errors.push("ยอดจ่ายของผู้จ่ายไม่ตรงกับยอดจ่ายสุทธิ");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  transformCreateData(data: Record<string, unknown>): Record<string, unknown> {
    const { vatAmount, whtAmount, netPaid, ...rest } = data;

    return {
      ...rest,
      amount: data.amount,
      vatAmount: vatAmount || null,
      whtAmount: data.isWht ? whtAmount : null,
      whtRate: data.isWht ? data.whtRate : null,
      whtType: data.isWht ? data.whtType : null,
      netPaid: netPaid || data.amount,
      billDate: data.billDate || new Date(),
      workflowStatus: data.workflowStatus || this.determineWorkflowStatus(data),
      approvalStatus: data.approvalStatus || "NOT_REQUIRED",
      hasTaxInvoice: data.hasTaxInvoice || false,
      isWht: Boolean(data.isWht),
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
      "netPaid",
      "billDate",
      "description",
      "contactId",
      "accountId",
      "invoiceNumber",
      "paymentMethod",
      "paymentDate",
      "dueDate",
      "hasTaxInvoice",
      "isWht",
      "workflowStatus",
      "slipUrls",
      "taxInvoiceUrls",
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
    return "expense";
  }

  getApiPath(): string {
    return "/api/expenses";
  }

  getUiPath(companyCode: string): string {
    return `/${companyCode.toLowerCase()}/expenses`;
  }

  getDetailPath(companyCode: string, transactionId: string): string {
    return `/${companyCode.toLowerCase()}/expenses/${transactionId}`;
  }

  getDisplayName(transaction: Record<string, unknown>): string {
    const contact = transaction.Contact as Record<string, unknown> | null;
    if (contact?.name) return String(contact.name);

    const description = transaction.description;
    return description ? String(description) : "ไม่ระบุ";
  }
}

// Export singleton instance
export const expenseStrategy = new ExpenseStrategy();
