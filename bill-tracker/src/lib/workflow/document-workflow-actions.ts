/**
 * document-workflow-actions.ts
 *
 * Pure action-resolution functions: no DB calls, just maps an action string
 * to the Prisma update payload and audit event type. Consumed by
 * executeWorkflowAction in document-workflow-service.ts.
 */

import { DocumentEventType, WorkflowStatus } from "@prisma/client";

// WorkflowError is defined in document-workflow-service.ts (the entry point).
// To avoid circular imports, we re-declare it locally here as a type alias.
// At runtime, instances thrown by these functions are caught in executeWorkflowAction.
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST"
  ) {
    super(message);
  }
}

export function resolveExpenseAction(
  action: string,
  expense: {
    isWht: boolean;
    workflowStatus: string;
    documentType: string;
    hasTaxInvoice: boolean;
    hasWhtCert: boolean;
    whtCertSentAt: Date | null;
  },
  targetStatus: string | undefined,
  now: Date
): {
  updateData: Record<string, unknown>;
  newStatus: WorkflowStatus | null;
  eventType: DocumentEventType | null;
} {
  const updateData: Record<string, unknown> = {};
  let newStatus: WorkflowStatus | null = null;
  let eventType: DocumentEventType | null = null;

  switch (action) {
    case "mark_tax_invoice_requested": {
      updateData.taxInvoiceRequestedAt = now;
      eventType = "TAX_INVOICE_REQUESTED";
      break;
    }
    case "cancel_tax_invoice_request": {
      updateData.taxInvoiceRequestedAt = null;
      eventType = "TAX_INVOICE_REQUESTED";
      break;
    }
    case "receive_tax_invoice": {
      updateData.hasTaxInvoice = true;
      updateData.taxInvoiceAt = now;
      eventType = "TAX_INVOICE_RECEIVED";
      break;
    }
    case "skip_to_wht":
    case "skip_to_accounting": {
      eventType = "STATUS_CHANGED";
      break;
    }
    case "issue_wht": {
      updateData.hasWhtCert = true;
      updateData.whtCertIssuedAt = now;
      eventType = "WHT_CERT_ISSUED";
      break;
    }
    case "send_wht": {
      updateData.whtCertSentAt = now;
      eventType = "WHT_CERT_SENT";
      break;
    }
    case "undo_receive_tax_invoice": {
      updateData.hasTaxInvoice = false;
      updateData.taxInvoiceAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_issue_wht": {
      updateData.hasWhtCert = false;
      updateData.whtCertIssuedAt = null;
      updateData.whtCertSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_send_wht": {
      updateData.whtCertSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "mark_ready_for_accounting":
      newStatus = "READY_FOR_ACCOUNTING";
      eventType = "STATUS_CHANGED";
      break;
    case "send_to_accounting":
      updateData.sentToAccountAt = now;
      newStatus = "SENT_TO_ACCOUNTANT";
      eventType = "SENT_TO_ACCOUNTANT";
      updateData.status = "SENT_TO_ACCOUNT";
      break;
    case "complete":
      newStatus = "COMPLETED";
      eventType = "STATUS_CHANGED";
      break;
    case "revert":
      newStatus = targetStatus as WorkflowStatus;
      eventType = "STATUS_CHANGED";
      break;
    default:
      throw new WorkflowError(`Unknown action: ${action}`, "BAD_REQUEST");
  }

  if (newStatus) updateData.workflowStatus = newStatus;
  return { updateData, newStatus, eventType };
}

export function resolveIncomeAction(
  action: string,
  income: {
    isWhtDeducted: boolean;
    workflowStatus: string;
    hasInvoice: boolean;
    invoiceSentAt: Date | null;
    hasWhtCert: boolean;
  },
  targetStatus: string | undefined,
  now: Date
): {
  updateData: Record<string, unknown>;
  newStatus: WorkflowStatus | null;
  eventType: DocumentEventType | null;
} {
  const updateData: Record<string, unknown> = {};
  let newStatus: WorkflowStatus | null = null;
  let eventType: DocumentEventType | null = null;

  switch (action) {
    case "issue_invoice": {
      updateData.hasInvoice = true;
      updateData.invoiceIssuedAt = now;
      eventType = "INVOICE_ISSUED";
      break;
    }
    case "send_invoice": {
      updateData.invoiceSentAt = now;
      eventType = "INVOICE_SENT";
      break;
    }
    case "receive_wht": {
      updateData.hasWhtCert = true;
      updateData.whtCertReceivedAt = now;
      eventType = "WHT_CERT_RECEIVED";
      break;
    }
    case "remind_wht":
      updateData.whtCertRemindedAt = now;
      updateData.whtCertRemindCount = { increment: 1 };
      eventType = "WHT_REMINDER_SENT";
      break;
    case "undo_issue_invoice": {
      updateData.hasInvoice = false;
      updateData.invoiceIssuedAt = null;
      updateData.invoiceSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_send_invoice": {
      updateData.invoiceSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_receive_wht": {
      updateData.hasWhtCert = false;
      updateData.whtCertReceivedAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "mark_ready_for_accounting":
      newStatus = "READY_FOR_ACCOUNTING";
      eventType = "STATUS_CHANGED";
      break;
    case "send_to_accounting":
      updateData.sentToAccountAt = now;
      newStatus = "SENT_TO_ACCOUNTANT";
      eventType = "SENT_TO_ACCOUNTANT";
      updateData.status = "SENT_COPY";
      break;
    case "complete":
      newStatus = "COMPLETED";
      eventType = "STATUS_CHANGED";
      break;
    case "revert":
      newStatus = targetStatus as WorkflowStatus;
      eventType = "STATUS_CHANGED";
      break;
    default:
      throw new WorkflowError(`Unknown action: ${action}`, "BAD_REQUEST");
  }

  if (newStatus) updateData.workflowStatus = newStatus;
  return { updateData, newStatus, eventType };
}
