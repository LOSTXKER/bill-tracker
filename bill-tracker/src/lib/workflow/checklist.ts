/**
 * Document Checklist Logic
 *
 * Determines which checklist items are required for a transaction
 * and whether all items are complete (ready for accounting).
 */

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  completedAt?: Date | string | null;
  actionLabel?: string;
  action?: string;
  undoAction?: string;
}

interface ExpenseChecklistInput {
  documentType?: string | null;
  isWht: boolean;
  hasTaxInvoice: boolean;
  taxInvoiceAt?: Date | string | null;
  taxInvoiceRequestedAt?: Date | string | null;
  hasWhtCert: boolean;
  whtCertIssuedAt?: Date | string | null;
  whtCertSentAt?: Date | string | null;
}

interface IncomeChecklistInput {
  isWhtDeducted: boolean;
  hasInvoice: boolean;
  invoiceIssuedAt?: Date | string | null;
  invoiceSentAt?: Date | string | null;
  hasWhtCert: boolean;
  whtCertReceivedAt?: Date | string | null;
}

export function getExpenseChecklist(expense: ExpenseChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (expense.documentType === "TAX_INVOICE") {
    items.push({
      key: "tax_invoice_requested",
      label: "ขอใบกำกับภาษี",
      completed: !!expense.taxInvoiceRequestedAt || expense.hasTaxInvoice,
      completedAt: expense.taxInvoiceRequestedAt || expense.taxInvoiceAt,
      actionLabel: "ขอแล้ว",
      action: "mark_tax_invoice_requested",
      undoAction: "cancel_tax_invoice_request",
    });
    items.push({
      key: "tax_invoice",
      label: "ได้รับใบกำกับภาษี",
      completed: expense.hasTaxInvoice,
      completedAt: expense.taxInvoiceAt,
      actionLabel: "ได้รับแล้ว",
      action: "receive_tax_invoice",
      undoAction: "undo_receive_tax_invoice",
    });
  } else if (expense.documentType === "CASH_RECEIPT") {
    items.push({
      key: "tax_invoice_requested",
      label: "ขอบิลเงินสด",
      completed: !!expense.taxInvoiceRequestedAt || expense.hasTaxInvoice,
      completedAt: expense.taxInvoiceRequestedAt || expense.taxInvoiceAt,
      actionLabel: "ขอแล้ว",
      action: "mark_tax_invoice_requested",
      undoAction: "cancel_tax_invoice_request",
    });
    items.push({
      key: "tax_invoice",
      label: "ได้รับบิลเงินสด",
      completed: expense.hasTaxInvoice,
      completedAt: expense.taxInvoiceAt,
      actionLabel: "ได้รับแล้ว",
      action: "receive_tax_invoice",
      undoAction: "undo_receive_tax_invoice",
    });
  }

  if (expense.isWht) {
    items.push({
      key: "wht_issued",
      label: "ออกหนังสือ 50 ทวิ",
      completed: expense.hasWhtCert,
      completedAt: expense.whtCertIssuedAt,
      actionLabel: "ออกแล้ว",
      action: "issue_wht",
      undoAction: "undo_issue_wht",
    });
    items.push({
      key: "wht_sent",
      label: "ส่ง 50 ทวิ ให้ vendor",
      completed: !!expense.whtCertSentAt,
      completedAt: expense.whtCertSentAt,
      actionLabel: "ส่งแล้ว",
      action: "send_wht",
      undoAction: "undo_send_wht",
    });
  }

  return items;
}

export function getIncomeChecklist(income: IncomeChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  items.push({
    key: "invoice_issued",
    label: "ออกใบแจ้งหนี้/ใบเสร็จ",
    completed: income.hasInvoice,
    completedAt: income.invoiceIssuedAt,
    actionLabel: "ออกแล้ว",
    action: "issue_invoice",
    undoAction: "undo_issue_invoice",
  });

  items.push({
    key: "invoice_sent",
    label: "ส่งใบแจ้งหนี้ให้ลูกค้า",
    completed: !!income.invoiceSentAt,
    completedAt: income.invoiceSentAt,
    actionLabel: "ส่งแล้ว",
    action: "send_invoice",
    undoAction: "undo_send_invoice",
  });

  if (income.isWhtDeducted) {
    items.push({
      key: "wht_received",
      label: "ได้รับ 50 ทวิ จากลูกค้า",
      completed: income.hasWhtCert,
      completedAt: income.whtCertReceivedAt,
      actionLabel: "ได้รับแล้ว",
      action: "receive_wht",
      undoAction: "undo_receive_wht",
    });
  }

  return items;
}

export function isExpenseReady(expense: ExpenseChecklistInput): boolean {
  const items = getExpenseChecklist(expense);
  if (items.length === 0) return true;
  return items.every((item) => item.completed);
}

export function isIncomeReady(income: IncomeChecklistInput): boolean {
  const items = getIncomeChecklist(income);
  if (items.length === 0) return true;
  return items.every((item) => item.completed);
}
