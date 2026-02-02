/**
 * Transaction Field Mapping Layer
 * 
 * Abstracts the differences between Expense and Income field names,
 * making it easier to write generic code that works with both types.
 * 
 * This addresses the inconsistent field naming:
 * - WHT flag: expense.isWht vs income.isWhtDeducted
 * - Net amount: expense.netPaid vs income.netReceived
 * - Date: expense.billDate vs income.receiveDate
 * - Description: expense.description vs income.source
 * - Payment date: expense.paymentDate vs income.receiveDate
 */

import type { Expense, Income } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type TransactionType = "expense" | "income";

/**
 * Common transaction fields that have different names in expense vs income
 */
export interface TransactionFieldMapping {
  /** The date field (billDate vs receiveDate) */
  dateField: string;
  /** Net amount field (netPaid vs netReceived) */
  netAmountField: string;
  /** WHT enabled flag (isWht vs isWhtDeducted) */
  whtFlagField: string;
  /** Description/source field (description vs source) */
  descriptionField: string;
  /** Contact relation field */
  contactField: string;
  /** Workflow status field */
  workflowStatusField: string;
  /** Document status (has doc) field */
  hasDocumentField: string;
  /** File URL fields */
  fileFields: {
    slip: string;
    taxInvoice: string;
    whtCert: string;
  };
}

/**
 * Common transaction interface for generic operations
 */
export interface CommonTransaction {
  id: string;
  companyId: string;
  date: Date | null;
  netAmount: number;
  amount: number;
  vatAmount: number | null;
  whtAmount: number | null;
  whtRate: number | null;
  isWhtEnabled: boolean;
  description: string | null;
  contactId: string | null;
  contactName: string | null;
  workflowStatus: string | null;
  approvalStatus: string;
  hasDocument: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Field Mappings
// =============================================================================

export const EXPENSE_FIELD_MAPPING: TransactionFieldMapping = {
  dateField: "billDate",
  netAmountField: "netPaid",
  whtFlagField: "isWht",
  descriptionField: "description",
  contactField: "Contact",
  workflowStatusField: "workflowStatus",
  hasDocumentField: "hasTaxInvoice",
  fileFields: {
    slip: "slipUrls",
    taxInvoice: "taxInvoiceUrls",
    whtCert: "whtCertUrls",
  },
};

export const INCOME_FIELD_MAPPING: TransactionFieldMapping = {
  dateField: "receiveDate",
  netAmountField: "netReceived",
  whtFlagField: "isWhtDeducted",
  descriptionField: "source",
  contactField: "Contact",
  workflowStatusField: "workflowStatus",
  hasDocumentField: "hasInvoice",
  fileFields: {
    slip: "customerSlipUrls",
    taxInvoice: "myBillCopyUrls",
    whtCert: "whtCertUrls",
  },
};

/**
 * Get field mapping for a transaction type
 */
export function getFieldMapping(type: TransactionType): TransactionFieldMapping {
  return type === "expense" ? EXPENSE_FIELD_MAPPING : INCOME_FIELD_MAPPING;
}

// =============================================================================
// Field Access Helpers
// =============================================================================

/**
 * Get the value of a mapped field from a transaction
 */
export function getTransactionField<T>(
  transaction: Record<string, unknown>,
  type: TransactionType,
  field: keyof TransactionFieldMapping
): T {
  const mapping = getFieldMapping(type);
  const fieldName = mapping[field];
  
  if (typeof fieldName === "object") {
    return fieldName as T;
  }
  
  return transaction[fieldName as string] as T;
}

/**
 * Get the net amount from a transaction (expense.netPaid or income.netReceived)
 */
export function getNetAmount(
  transaction: Record<string, unknown>,
  type: TransactionType
): number {
  const mapping = getFieldMapping(type);
  return Number(transaction[mapping.netAmountField]) || 0;
}

/**
 * Get the date from a transaction (expense.billDate or income.receiveDate)
 */
export function getTransactionDate(
  transaction: Record<string, unknown>,
  type: TransactionType
): Date | null {
  const mapping = getFieldMapping(type);
  const value = transaction[mapping.dateField];
  return value ? new Date(value as string | Date) : null;
}

/**
 * Check if WHT is enabled on a transaction
 */
export function isWhtEnabled(
  transaction: Record<string, unknown>,
  type: TransactionType
): boolean {
  const mapping = getFieldMapping(type);
  return Boolean(transaction[mapping.whtFlagField]);
}

/**
 * Get description/source from a transaction
 */
export function getDescription(
  transaction: Record<string, unknown>,
  type: TransactionType
): string | null {
  const mapping = getFieldMapping(type);
  return (transaction[mapping.descriptionField] as string) || null;
}

/**
 * Get contact name from a transaction (handles Contact relation)
 */
export function getContactName(
  transaction: Record<string, unknown>,
  type: TransactionType
): string | null {
  const mapping = getFieldMapping(type);
  const contact = transaction[mapping.contactField] as Record<string, unknown> | null;
  return contact?.name as string || null;
}

// =============================================================================
// Transaction Normalization
// =============================================================================

/**
 * Normalize an expense to a common transaction interface
 */
export function normalizeExpense(
  expense: Expense & { Contact?: { name: string } | null }
): CommonTransaction {
  return {
    id: expense.id,
    companyId: expense.companyId,
    date: expense.billDate,
    netAmount: Number(expense.netPaid) || 0,
    amount: Number(expense.amount) || 0,
    vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
    whtAmount: expense.whtAmount ? Number(expense.whtAmount) : null,
    whtRate: expense.whtRate ? Number(expense.whtRate) : null,
    isWhtEnabled: expense.isWht || false,
    description: expense.description,
    contactId: expense.contactId,
    contactName: expense.Contact?.name || null,
    workflowStatus: expense.workflowStatus,
    approvalStatus: expense.approvalStatus,
    hasDocument: expense.hasTaxInvoice || false,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

/**
 * Normalize an income to a common transaction interface
 */
export function normalizeIncome(
  income: Income & { Contact?: { name: string } | null }
): CommonTransaction {
  return {
    id: income.id,
    companyId: income.companyId,
    date: income.receiveDate,
    netAmount: Number(income.netReceived) || 0,
    amount: Number(income.amount) || 0,
    vatAmount: income.vatAmount ? Number(income.vatAmount) : null,
    whtAmount: income.whtAmount ? Number(income.whtAmount) : null,
    whtRate: income.whtRate ? Number(income.whtRate) : null,
    isWhtEnabled: income.isWhtDeducted || false,
    description: income.source,
    contactId: income.contactId,
    contactName: income.Contact?.name || null,
    workflowStatus: income.workflowStatus,
    approvalStatus: income.approvalStatus,
    hasDocument: income.hasInvoice || false,
    createdAt: income.createdAt,
    updatedAt: income.updatedAt,
  };
}

/**
 * Normalize any transaction to a common interface
 */
export function normalizeTransaction(
  transaction: (Expense | Income) & { Contact?: { name: string } | null },
  type: TransactionType
): CommonTransaction {
  return type === "expense"
    ? normalizeExpense(transaction as Expense & { Contact?: { name: string } | null })
    : normalizeIncome(transaction as Income & { Contact?: { name: string } | null });
}

// =============================================================================
// Display Labels
// =============================================================================

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "รายจ่าย",
  income: "รายรับ",
};

export const TRANSACTION_TYPE_LABELS_EN: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
};

/**
 * Get the Thai label for a transaction type
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  return TRANSACTION_TYPE_LABELS[type];
}

/**
 * Get display label for the net amount field
 */
export function getNetAmountLabel(type: TransactionType): string {
  return type === "expense" ? "ยอดจ่ายสุทธิ" : "ยอดรับสุทธิ";
}

/**
 * Get display label for the date field
 */
export function getDateLabel(type: TransactionType): string {
  return type === "expense" ? "วันที่บิล" : "วันที่รับเงิน";
}

/**
 * Get display label for the description field
 */
export function getDescriptionLabel(type: TransactionType): string {
  return type === "expense" ? "รายละเอียด" : "แหล่งรายได้";
}

/**
 * Get display label for the contact field
 */
export function getContactLabel(type: TransactionType): string {
  return type === "expense" ? "ผู้ขาย/ร้านค้า" : "ลูกค้า";
}

/**
 * Get display label for the WHT flag
 */
export function getWhtLabel(type: TransactionType): string {
  return type === "expense" 
    ? "หัก ณ ที่จ่าย (เราหัก)" 
    : "ถูกหัก ณ ที่จ่าย (ลูกค้าหัก)";
}

// =============================================================================
// Permission Mapping
// =============================================================================

/**
 * Get the permission prefix for a transaction type
 */
export function getPermissionPrefix(type: TransactionType): string {
  return type === "expense" ? "expenses" : "incomes";
}

/**
 * Get permission string for an action
 */
export function getPermission(type: TransactionType, action: string): string {
  return `${getPermissionPrefix(type)}:${action}`;
}
