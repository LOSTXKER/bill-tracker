import type { ReactNode } from "react";

export interface WorkflowActionsProps {
  companyCode: string;
  type?: "expense" | "income";
  transactionType?: "expense" | "income";
  transactionId: string;
  currentStatus?: string;
  workflowStatus?: string;
  isWht?: boolean;
  isWhtDeducted?: boolean;
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  taxInvoiceRequestedAt?: string | Date | null;
  onActionComplete?: () => void;
  variant?: "default" | "compact";
  isOwner?: boolean;
}

export interface ActionConfig {
  action: string;
  label: string;
  icon: ReactNode;
  description: string;
  requiresConfirm?: boolean;
}
