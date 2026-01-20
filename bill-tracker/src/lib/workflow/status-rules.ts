/**
 * Workflow Status Rules
 * กำหนด flow และกฎการเปลี่ยนสถานะของ Expense/Income
 */

import { EXPENSE_STATUS_LABELS, INCOME_STATUS_LABELS } from "@/lib/constants/transaction";

// =============================================================================
// Expense Workflow Order
// =============================================================================

/**
 * ลำดับสถานะของ Expense (ไม่รวม WHT_SENT_TO_VENDOR เพราะเป็น optional)
 * Flow: DRAFT → PAID → WAITING_TAX_INVOICE → TAX_INVOICE_RECEIVED 
 *       → WHT_PENDING_ISSUE → WHT_ISSUED → READY_FOR_ACCOUNTING 
 *       → SENT_TO_ACCOUNTANT → COMPLETED
 */
export const EXPENSE_WORKFLOW_ORDER: string[] = [
  "DRAFT",
  "PAID",
  "WAITING_TAX_INVOICE",
  "TAX_INVOICE_RECEIVED",
  "WHT_PENDING_ISSUE",
  "WHT_ISSUED",
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
  "COMPLETED",
];

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

// =============================================================================
// Helper Functions
// =============================================================================

export interface NextStatusInfo {
  value: string;
  label: string;
}

/**
 * หาสถานะถัดไปที่เป็นไปได้จากสถานะปัจจุบัน
 * @param currentStatus สถานะปัจจุบัน
 * @param type ประเภท expense หรือ income
 * @returns NextStatusInfo หรือ null ถ้าไม่มีสถานะถัดไป
 */
export function getNextStatus(
  currentStatus: string,
  type: "expense" | "income"
): NextStatusInfo | null {
  const order = type === "expense" ? EXPENSE_WORKFLOW_ORDER : INCOME_WORKFLOW_ORDER;
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
 * @returns true ถ้าเปลี่ยนได้
 */
export function canChangeStatus(
  currentStatus: string,
  targetStatus: string,
  type: "expense" | "income"
): boolean {
  const nextStatus = getNextStatus(currentStatus, type);
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
