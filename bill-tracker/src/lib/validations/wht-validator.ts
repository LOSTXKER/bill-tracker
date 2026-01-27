/**
 * Generic WHT (Withholding Tax) Change Validator
 * 
 * Provides a factory function to create WHT validation logic for both
 * expense and income transactions. This eliminates duplicate validation
 * code between expense-config.ts and income-config.ts.
 */

import { WHT_LOCKED_STATUSES } from "@/lib/constants/transaction";

// =============================================================================
// Types
// =============================================================================

export interface WhtChangeValidation {
  allowed: boolean;
  requiresConfirmation: boolean;
  message?: string;
  rollbackStatus?: string;
}

export interface WhtValidatorConfig {
  /**
   * Transaction type for context in messages
   */
  type: "expense" | "income";
  
  /**
   * Status that indicates WHT cert has been issued/received
   * - Expense: "WHT_ISSUED" (50 ทวิ ออกแล้ว)
   * - Income: "WHT_CERT_RECEIVED" (ได้รับ 50 ทวิแล้ว)
   */
  whtCertStatus: string;
  
  /**
   * Status before accounting stage
   */
  readyForAccountingStatus: string;
  
  /**
   * Status to rollback to when removing WHT
   * - Expense: "TAX_INVOICE_RECEIVED"
   * - Income: "INVOICE_ISSUED"
   */
  rollbackStatusWhenRemovingWht: string;
  
  /**
   * Status to rollback to when adding WHT
   * - Expense: "WHT_PENDING_ISSUE"
   * - Income: "WHT_PENDING_CERT"
   */
  rollbackStatusWhenAddingWht: string;
  
  /**
   * Custom messages for different scenarios
   */
  messages: {
    /** Message when WHT change is locked (after accounting) */
    locked: string;
    /** Message when removing WHT and cert has been issued/received */
    certIssuedRemoveWht: string;
    /** Message when removing WHT with cert attached */
    certAttachedRemoveWht: string;
    /** Message when adding WHT */
    addWht: string;
  };
}

// =============================================================================
// Predefined Configurations
// =============================================================================

export const EXPENSE_WHT_CONFIG: WhtValidatorConfig = {
  type: "expense",
  whtCertStatus: "WHT_ISSUED",
  readyForAccountingStatus: "READY_FOR_ACCOUNTING",
  rollbackStatusWhenRemovingWht: "TAX_INVOICE_RECEIVED",
  rollbackStatusWhenAddingWht: "WHT_PENDING_ISSUE",
  messages: {
    locked: "ไม่สามารถเปลี่ยนสถานะหัก ณ ที่จ่ายได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว",
    certIssuedRemoveWht: "คุณได้ออกหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) แล้ว การยกเลิกจะต้อง void เอกสาร 50 ทวิด้วย",
    certAttachedRemoveWht: "คุณมีหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) แนบอยู่ การยกเลิกจะลบเอกสารออกด้วย",
    addWht: "การเพิ่มหัก ณ ที่จ่ายจะต้องออกหนังสือรับรอง (50 ทวิ) ก่อนส่งบัญชี",
  },
};

export const INCOME_WHT_CONFIG: WhtValidatorConfig = {
  type: "income",
  whtCertStatus: "WHT_CERT_RECEIVED",
  readyForAccountingStatus: "READY_FOR_ACCOUNTING",
  rollbackStatusWhenRemovingWht: "INVOICE_ISSUED",
  rollbackStatusWhenAddingWht: "WHT_PENDING_CERT",
  messages: {
    locked: "ไม่สามารถเปลี่ยนสถานะหัก ณ ที่จ่ายได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว",
    certIssuedRemoveWht: "คุณได้รับหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) จากลูกค้าแล้ว การยกเลิกจะต้องลบเอกสารด้วย",
    certAttachedRemoveWht: "คุณมีหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) แนบอยู่ การยกเลิกจะลบเอกสารออกด้วย",
    addWht: "การเพิ่มหัก ณ ที่จ่ายจะต้องได้รับหนังสือรับรอง (50 ทวิ) จากลูกค้าก่อนส่งบัญชี",
  },
};

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a WHT change validator function based on the provided configuration.
 * 
 * @param config - Configuration for the validator
 * @returns A function that validates WHT changes
 * 
 * @example
 * ```typescript
 * const validateExpenseWht = createWhtValidator(EXPENSE_WHT_CONFIG);
 * const result = validateExpenseWht("READY_FOR_ACCOUNTING", true, false, true);
 * // result.allowed === true
 * // result.requiresConfirmation === true
 * // result.message === "คุณมีหนังสือรับรอง..."
 * ```
 */
export function createWhtValidator(config: WhtValidatorConfig) {
  return function validateWhtChange(
    currentStatus: string,
    wasWht: boolean,
    nowWht: boolean,
    hasWhtCert: boolean
  ): WhtChangeValidation {
    // No change - always allowed
    if (wasWht === nowWht) {
      return { allowed: true, requiresConfirmation: false };
    }

    // Locked after accounting
    if (WHT_LOCKED_STATUSES.includes(currentStatus as typeof WHT_LOCKED_STATUSES[number])) {
      return {
        allowed: false,
        requiresConfirmation: false,
        message: config.messages.locked,
      };
    }

    // Removing WHT when cert has been issued/received
    if (wasWht && !nowWht && currentStatus === config.whtCertStatus) {
      return {
        allowed: true,
        requiresConfirmation: true,
        message: config.messages.certIssuedRemoveWht,
        rollbackStatus: config.rollbackStatusWhenRemovingWht,
      };
    }

    // Removing WHT when ready for accounting (with cert attached)
    if (wasWht && !nowWht && currentStatus === config.readyForAccountingStatus && hasWhtCert) {
      return {
        allowed: true,
        requiresConfirmation: true,
        message: config.messages.certAttachedRemoveWht,
        rollbackStatus: config.rollbackStatusWhenRemovingWht,
      };
    }

    // Adding WHT when ready for accounting
    if (!wasWht && nowWht && currentStatus === config.readyForAccountingStatus) {
      return {
        allowed: true,
        requiresConfirmation: true,
        message: config.messages.addWht,
        rollbackStatus: config.rollbackStatusWhenAddingWht,
      };
    }

    // Default: allowed without confirmation
    return { allowed: true, requiresConfirmation: false };
  };
}

// =============================================================================
// Pre-built Validators
// =============================================================================

/**
 * Validator for expense WHT changes
 */
export const validateExpenseWhtChange = createWhtValidator(EXPENSE_WHT_CONFIG);

/**
 * Validator for income WHT changes
 */
export const validateIncomeWhtChange = createWhtValidator(INCOME_WHT_CONFIG);
