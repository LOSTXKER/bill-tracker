/**
 * Workflow Status Rules
 * กำหนด flow และกฎการเปลี่ยนสถานะของ Expense/Income
 */

import { EXPENSE_STATUS_LABELS, INCOME_STATUS_LABELS } from "@/lib/constants/transaction";

// =============================================================================
// Expense Workflow Order
// =============================================================================

/**
 * ลำดับสถานะของ Expense (รวม WHT_SENT_TO_VENDOR ซึ่งเป็น optional WHT status)
 * Flow: DRAFT → PAID → WAITING_TAX_INVOICE → TAX_INVOICE_RECEIVED 
 *       → WHT_PENDING_ISSUE → WHT_ISSUED → WHT_SENT_TO_VENDOR
 *       → READY_FOR_ACCOUNTING → SENT_TO_ACCOUNTANT → COMPLETED
 */
export const EXPENSE_WORKFLOW_ORDER: string[] = [
  "DRAFT",
  "PAID",
  "WAITING_TAX_INVOICE",
  "TAX_INVOICE_RECEIVED",
  "WHT_PENDING_ISSUE",
  "WHT_ISSUED",
  "WHT_SENT_TO_VENDOR",
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
  "COMPLETED",
];

// WHT-related statuses for expenses
const EXPENSE_WHT_STATUSES = ["WHT_PENDING_ISSUE", "WHT_ISSUED", "WHT_SENT_TO_VENDOR"];

// Tax invoice related statuses for expenses (skip if documentType is NO_DOCUMENT or CASH_RECEIPT)
const EXPENSE_TAX_INVOICE_STATUSES = ["WAITING_TAX_INVOICE", "TAX_INVOICE_RECEIVED"];

// =============================================================================
// Income Workflow Order
// =============================================================================

/**
 * ลำดับสถานะของ Income
 * Flow: DRAFT → RECEIVED → WAITING_INVOICE_ISSUE → INVOICE_ISSUED 
 *       → INVOICE_SENT → WHT_PENDING_CERT → WHT_CERT_RECEIVED 
 *       → READY_FOR_ACCOUNTING → SENT_TO_ACCOUNTANT → COMPLETED
 */
export const INCOME_WORKFLOW_ORDER: string[] = [
  "DRAFT",
  "RECEIVED",
  "WAITING_INVOICE_ISSUE",
  "INVOICE_ISSUED",
  "INVOICE_SENT",
  "WHT_PENDING_CERT",
  "WHT_CERT_RECEIVED",
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
  "COMPLETED",
];

// WHT-related statuses for incomes
const INCOME_WHT_STATUSES = ["WHT_PENDING_CERT", "WHT_CERT_RECEIVED"];

// =============================================================================
// Helper Functions
// =============================================================================

export interface NextStatusInfo {
  value: string;
  label: string;
}

export interface TransactionWorkflowContext {
  /** For expenses: true if WHT applies */
  isWht?: boolean;
  /** For incomes: true if WHT was deducted */
  isWhtDeducted?: boolean;
  /** For expenses: document type (TAX_INVOICE, CASH_RECEIPT, NO_DOCUMENT) */
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT" | null;
}

/**
 * Get the effective workflow order based on transaction context
 * Skips statuses that don't apply (e.g., WHT statuses for non-WHT items)
 */
export function getEffectiveWorkflowOrder(
  type: "expense" | "income",
  context?: TransactionWorkflowContext
): string[] {
  const baseOrder = type === "expense" ? EXPENSE_WORKFLOW_ORDER : INCOME_WORKFLOW_ORDER;
  
  if (!context) return baseOrder;
  
  return baseOrder.filter(status => {
    if (type === "expense") {
      // Skip WHT statuses if no WHT
      if (EXPENSE_WHT_STATUSES.includes(status) && !context.isWht) {
        return false;
      }
      // Skip tax invoice statuses if document type is NO_DOCUMENT or CASH_RECEIPT
      if (EXPENSE_TAX_INVOICE_STATUSES.includes(status)) {
        if (context.documentType === "NO_DOCUMENT" || context.documentType === "CASH_RECEIPT") {
          return false;
        }
      }
    } else {
      // Skip WHT statuses if no WHT deducted
      if (INCOME_WHT_STATUSES.includes(status) && !context.isWhtDeducted) {
        return false;
      }
    }
    return true;
  });
}

/**
 * หาสถานะถัดไปที่เป็นไปได้จากสถานะปัจจุบัน
 * @param currentStatus สถานะปัจจุบัน
 * @param type ประเภท expense หรือ income
 * @param context ข้อมูลบริบทของรายการ (isWht, documentType, etc.)
 * @returns NextStatusInfo หรือ null ถ้าไม่มีสถานะถัดไป
 */
export function getNextStatus(
  currentStatus: string,
  type: "expense" | "income",
  context?: TransactionWorkflowContext
): NextStatusInfo | null {
  const order = getEffectiveWorkflowOrder(type, context);
  const labels = type === "expense" ? EXPENSE_STATUS_LABELS : INCOME_STATUS_LABELS;

  const currentIndex = order.indexOf(currentStatus);

  // ไม่พบสถานะในรายการ หรือ อยู่ท้ายสุดแล้ว
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }

  const nextValue = order[currentIndex + 1];
  const nextLabel = labels[nextValue]?.label || nextValue;

  return {
    value: nextValue,
    label: nextLabel,
  };
}

/**
 * ตรวจสอบว่าสามารถเปลี่ยนสถานะได้หรือไม่ (เฉพาะไปข้างหน้า 1 ขั้น)
 * @param currentStatus สถานะปัจจุบัน
 * @param targetStatus สถานะที่ต้องการเปลี่ยนไป
 * @param type ประเภท expense หรือ income
 * @param context ข้อมูลบริบทของรายการ (isWht, documentType, etc.)
 * @returns true ถ้าเปลี่ยนได้
 */
export function canChangeStatus(
  currentStatus: string,
  targetStatus: string,
  type: "expense" | "income",
  context?: TransactionWorkflowContext
): boolean {
  const nextStatus = getNextStatus(currentStatus, type, context);
  return nextStatus !== null && nextStatus.value === targetStatus;
}

/**
 * ดึง label ของสถานะ
 * @param status สถานะ
 * @param type ประเภท expense หรือ income
 * @returns label ของสถานะ
 */
export function getStatusLabel(status: string, type: "expense" | "income"): string {
  const labels = type === "expense" ? EXPENSE_STATUS_LABELS : INCOME_STATUS_LABELS;
  return labels[status]?.label || status;
}

/**
 * หาสถานะก่อนหน้าที่เป็นไปได้จากสถานะปัจจุบัน (สำหรับ Owner ย้อนสถานะ)
 * @param currentStatus สถานะปัจจุบัน
 * @param type ประเภท expense หรือ income
 * @param context ข้อมูลบริบทของรายการ (isWht, documentType, etc.)
 * @returns NextStatusInfo หรือ null ถ้าไม่มีสถานะก่อนหน้า
 */
export function getPreviousStatus(
  currentStatus: string,
  type: "expense" | "income",
  context?: TransactionWorkflowContext
): NextStatusInfo | null {
  const order = getEffectiveWorkflowOrder(type, context);
  const labels = type === "expense" ? EXPENSE_STATUS_LABELS : INCOME_STATUS_LABELS;

  const currentIndex = order.indexOf(currentStatus);

  // ไม่พบสถานะในรายการ หรือ อยู่ต้นสุดแล้ว (ไม่สามารถย้อนได้)
  // ไม่อนุญาตให้ย้อนกลับไปที่ DRAFT
  if (currentIndex <= 1) {
    return null;
  }

  const prevValue = order[currentIndex - 1];
  const prevLabel = labels[prevValue]?.label || prevValue;

  return {
    value: prevValue,
    label: prevLabel,
  };
}

/**
 * ดึงรายการสถานะทั้งหมดที่สามารถเลือกได้ (สำหรับ Owner)
 * Owner สามารถเลือกสถานะใดก็ได้ใน workflow (ยกเว้น DRAFT)
 * @param currentStatus สถานะปัจจุบัน
 * @param type ประเภท expense หรือ income
 * @param context ข้อมูลบริบทของรายการ
 * @returns รายการสถานะที่เลือกได้
 */
export function getAllAvailableStatuses(
  currentStatus: string,
  type: "expense" | "income",
  context?: TransactionWorkflowContext
): NextStatusInfo[] {
  const order = getEffectiveWorkflowOrder(type, context);
  const labels = type === "expense" ? EXPENSE_STATUS_LABELS : INCOME_STATUS_LABELS;

  // คืนค่าสถานะทั้งหมดยกเว้น DRAFT และสถานะปัจจุบัน
  return order
    .filter(status => status !== "DRAFT" && status !== currentStatus)
    .map(status => ({
      value: status,
      label: labels[status]?.label || status,
    }));
}
