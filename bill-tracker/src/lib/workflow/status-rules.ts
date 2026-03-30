/**
 * Workflow Status Rules
 * Uses the 6 macro statuses: DRAFT → PENDING_APPROVAL → ACTIVE → READY_FOR_ACCOUNTING → SENT_TO_ACCOUNTANT → COMPLETED
 */

import { WORKFLOW_STATUS_FLOW, WORKFLOW_STATUS_LABELS } from "@/lib/constants/transaction";

const WORKFLOW_ORDER: readonly string[] = WORKFLOW_STATUS_FLOW;

export interface NextStatusInfo {
  value: string;
  label: string;
}

export interface TransactionWorkflowContext {
  isWht?: boolean;
  isWhtDeducted?: boolean;
  documentType?: import("@prisma/client").ExpenseDocumentType | null;
}

export function getEffectiveWorkflowOrder(
  _type: "expense" | "income",
  _context?: TransactionWorkflowContext
): readonly string[] {
  return WORKFLOW_ORDER;
}

export function getNextStatus(
  currentStatus: string,
  _type: "expense" | "income",
  _context?: TransactionWorkflowContext
): NextStatusInfo | null {
  const order = WORKFLOW_ORDER;
  const currentIndex = order.indexOf(currentStatus);

  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }

  const nextValue = order[currentIndex + 1];
  return {
    value: nextValue,
    label: WORKFLOW_STATUS_LABELS[nextValue]?.label || nextValue,
  };
}

export function canChangeStatus(
  currentStatus: string,
  targetStatus: string,
  type: "expense" | "income",
  context?: TransactionWorkflowContext
): boolean {
  const nextStatus = getNextStatus(currentStatus, type, context);
  return nextStatus !== null && nextStatus.value === targetStatus;
}

export function getStatusLabel(status: string, _type: "expense" | "income"): string {
  return WORKFLOW_STATUS_LABELS[status]?.label || status;
}

/**
 * Explicit revert map — not a simple "one step back".
 * PENDING_APPROVAL uses "ยกเลิกคำขอ" (withdraw) instead of revert.
 * ACTIVE reverts to DRAFT (already approved, undo everything).
 * SENT_TO_ACCOUNTANT reverts to ACTIVE (accountant found issues, redo docs).
 */
export const REVERT_MAP: Record<string, string> = {
  ACTIVE: "DRAFT",
  READY_FOR_ACCOUNTING: "ACTIVE",
  SENT_TO_ACCOUNTANT: "ACTIVE",
  COMPLETED: "SENT_TO_ACCOUNTANT",
};

export function getPreviousStatus(
  currentStatus: string,
  _type: "expense" | "income",
  _context?: TransactionWorkflowContext
): NextStatusInfo | null {
  const target = REVERT_MAP[currentStatus];
  if (!target) return null;

  return {
    value: target,
    label: WORKFLOW_STATUS_LABELS[target]?.label || target,
  };
}

export function getAllAvailableStatuses(
  currentStatus: string,
  _type: "expense" | "income",
  _context?: TransactionWorkflowContext
): NextStatusInfo[] {
  return WORKFLOW_ORDER
    .filter(status => status !== "DRAFT" && status !== currentStatus)
    .map(status => ({
      value: status,
      label: WORKFLOW_STATUS_LABELS[status]?.label || status,
    }));
}
