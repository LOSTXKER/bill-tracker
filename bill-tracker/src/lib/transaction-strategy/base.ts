/**
 * Transaction Strategy Pattern
 * 
 * Base interface and abstract implementation for transaction types.
 * Makes it easy to add new transaction types (transfers, journal entries, etc.)
 * without modifying existing code.
 */

import type { Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type TransactionType = "expense" | "income" | "transfer" | "adjustment";

export interface TransactionFieldMapping {
  dateField: string;
  netAmountField: string;
  whtFlagField: string;
  descriptionField: string;
  contactField: string;
  workflowStatusField: string;
  hasDocumentField: string;
}

export interface TransactionPermissions {
  read: string;
  create: string;
  update: string;
  delete: string;
  approve?: string;
  createDirect?: string;
}

export interface TransactionLabels {
  singular: string;
  plural: string;
  singularEn: string;
  pluralEn: string;
  dateLabel: string;
  amountLabel: string;
  contactLabel: string;
  whtLabel: string;
  descriptionLabel: string;
}

export interface WorkflowStatus {
  value: string;
  label: string;
  description: string;
  color: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// =============================================================================
// Transaction Strategy Interface
// =============================================================================

export interface ITransactionStrategy {
  /** Transaction type identifier */
  readonly type: TransactionType;

  /** Display labels */
  readonly labels: TransactionLabels;

  /** Field mappings */
  readonly fields: TransactionFieldMapping;

  /** Permission strings */
  readonly permissions: TransactionPermissions;

  /** Workflow statuses */
  readonly workflowStatuses: WorkflowStatus[];

  /**
   * Validate transaction data before creation
   */
  validateCreate(data: Record<string, unknown>): ValidationResult;

  /**
   * Validate transaction data before update
   */
  validateUpdate(
    existingData: Record<string, unknown>,
    updates: Record<string, unknown>
  ): ValidationResult;

  /**
   * Transform data for creation (API to database)
   */
  transformCreateData(data: Record<string, unknown>): Record<string, unknown>;

  /**
   * Transform data for update (API to database)
   */
  transformUpdateData(
    existingData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown>;

  /**
   * Calculate totals (amount, VAT, WHT)
   */
  calculateTotals(
    amount: number,
    vatRate: number,
    whtRate: number
  ): {
    baseAmount: number;
    vatAmount: number;
    whtAmount: number;
    totalWithVat: number;
    netAmount: number;
  };

  /**
   * Determine default workflow status based on data
   */
  determineWorkflowStatus(data: Record<string, unknown>): string;

  /**
   * Get the next available workflow status
   */
  getNextStatus(currentStatus: string, data: Record<string, unknown>): string | null;

  /**
   * Check if status transition is allowed
   */
  canTransitionTo(fromStatus: string, toStatus: string): boolean;

  /**
   * Get display name for a contact
   */
  getDisplayName(transaction: Record<string, unknown>): string;

  /**
   * Get Prisma model name
   */
  getPrismaModel(): string;

  /**
   * Get API endpoint base path
   */
  getApiPath(): string;

  /**
   * Get UI route path
   */
  getUiPath(companyCode: string): string;

  /**
   * Get detail page path
   */
  getDetailPath(companyCode: string, transactionId: string): string;
}

// =============================================================================
// Abstract Base Class
// =============================================================================

export abstract class BaseTransactionStrategy implements ITransactionStrategy {
  abstract readonly type: TransactionType;
  abstract readonly labels: TransactionLabels;
  abstract readonly fields: TransactionFieldMapping;
  abstract readonly permissions: TransactionPermissions;
  abstract readonly workflowStatuses: WorkflowStatus[];

  // Default implementations that can be overridden

  validateCreate(data: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];

    // Basic validation
    if (!data.amount || Number(data.amount) <= 0) {
      errors.push("ยอดเงินต้องมากกว่า 0");
    }

    if (!data[this.fields.dateField]) {
      errors.push("กรุณาระบุวันที่");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateUpdate(
    existingData: Record<string, unknown>,
    updates: Record<string, unknown>
  ): ValidationResult {
    const errors: string[] = [];

    // Check if locked
    const status = existingData[this.fields.workflowStatusField] as string;
    if (["SENT_TO_ACCOUNTANT", "COMPLETED"].includes(status)) {
      errors.push("ไม่สามารถแก้ไขรายการที่ส่งบัญชีแล้ว");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  abstract transformCreateData(data: Record<string, unknown>): Record<string, unknown>;
  abstract transformUpdateData(
    existingData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown>;

  calculateTotals(
    amount: number,
    vatRate: number,
    whtRate: number
  ): {
    baseAmount: number;
    vatAmount: number;
    whtAmount: number;
    totalWithVat: number;
    netAmount: number;
  } {
    const base = Number(amount) || 0;
    const vat = Number(vatRate) || 0;
    const wht = Number(whtRate) || 0;

    const vatAmount = Math.round((base * vat) / 100 * 100) / 100;
    const whtAmount = Math.round((base * wht) / 100 * 100) / 100;
    const totalWithVat = base + vatAmount;
    const netAmount = totalWithVat - whtAmount;

    return {
      baseAmount: base,
      vatAmount,
      whtAmount,
      totalWithVat,
      netAmount,
    };
  }

  abstract determineWorkflowStatus(data: Record<string, unknown>): string;

  getNextStatus(currentStatus: string, data: Record<string, unknown>): string | null {
    const currentIndex = this.workflowStatuses.findIndex((s) => s.value === currentStatus);
    if (currentIndex === -1 || currentIndex === this.workflowStatuses.length - 1) {
      return null;
    }
    return this.workflowStatuses[currentIndex + 1].value;
  }

  canTransitionTo(fromStatus: string, toStatus: string): boolean {
    const fromIndex = this.workflowStatuses.findIndex((s) => s.value === fromStatus);
    const toIndex = this.workflowStatuses.findIndex((s) => s.value === toStatus);

    if (fromIndex === -1 || toIndex === -1) return false;

    // Allow forward transitions
    return toIndex > fromIndex;
  }

  getDisplayName(transaction: Record<string, unknown>): string {
    const contact = transaction[this.fields.contactField] as Record<string, unknown> | null;
    if (contact?.name) return String(contact.name);

    const description = transaction[this.fields.descriptionField];
    return description ? String(description) : "ไม่ระบุ";
  }

  abstract getPrismaModel(): string;

  getApiPath(): string {
    return `/api/${this.type}s`;
  }

  getUiPath(companyCode: string): string {
    return `/${companyCode}/${this.type}s`;
  }

  getDetailPath(companyCode: string, transactionId: string): string {
    return `/${companyCode}/${this.type}s/${transactionId}`;
  }
}

// =============================================================================
// Transaction Strategy Registry
// =============================================================================

class TransactionStrategyRegistry {
  private strategies = new Map<TransactionType, ITransactionStrategy>();

  register(strategy: ITransactionStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  get(type: TransactionType): ITransactionStrategy | undefined {
    return this.strategies.get(type);
  }

  getOrThrow(type: TransactionType): ITransactionStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Transaction strategy not found for type: ${type}`);
    }
    return strategy;
  }

  getAll(): ITransactionStrategy[] {
    return Array.from(this.strategies.values());
  }

  getAllTypes(): TransactionType[] {
    return Array.from(this.strategies.keys());
  }

  has(type: TransactionType): boolean {
    return this.strategies.has(type);
  }
}

// Export singleton instance
export const transactionRegistry = new TransactionStrategyRegistry();

// Helper function to get strategy
export function getTransactionStrategy(type: TransactionType): ITransactionStrategy {
  return transactionRegistry.getOrThrow(type);
}
