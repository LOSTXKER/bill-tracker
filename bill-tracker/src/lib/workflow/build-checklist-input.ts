/**
 * Maps a transaction record to the checklist input shape.
 * Single source of truth for both DocumentChecklist and ActiveStatusCTA.
 */

import { getExpenseChecklist, getIncomeChecklist, type ChecklistItem } from "./checklist";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildChecklistItems(transaction: Record<string, any>, type: "expense" | "income"): ChecklistItem[] {
  if (type === "expense") {
    return getExpenseChecklist({
      documentType: transaction.documentType ?? "TAX_INVOICE",
      isWht: !!transaction.isWht,
      hasTaxInvoice: !!transaction.hasTaxInvoice,
      taxInvoiceAt: transaction.taxInvoiceAt ?? null,
      taxInvoiceRequestedAt: transaction.taxInvoiceRequestedAt ?? null,
      hasWhtCert: !!transaction.hasWhtCert,
      whtCertIssuedAt: transaction.whtCertIssuedAt ?? null,
      whtCertSentAt: transaction.whtCertSentAt ?? null,
    });
  }
  return getIncomeChecklist({
    isWhtDeducted: !!transaction.isWhtDeducted,
    hasInvoice: !!transaction.hasInvoice,
    invoiceIssuedAt: transaction.invoiceIssuedAt ?? null,
    invoiceSentAt: transaction.invoiceSentAt ?? null,
    hasWhtCert: !!transaction.hasWhtCert,
    whtCertReceivedAt: transaction.whtCertReceivedAt ?? null,
  });
}
