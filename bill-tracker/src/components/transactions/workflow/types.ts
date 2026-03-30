import type { ReactNode } from "react";
import type { ExpenseDocumentType } from "@prisma/client";

export interface WorkflowActionsProps {
  companyCode: string;
  type?: "expense" | "income";
  transactionType?: "expense" | "income";
  transactionId: string;
  currentStatus?: string;
  workflowStatus?: string;
  isWht?: boolean;
  isWhtDeducted?: boolean;
  documentType?: ExpenseDocumentType;
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
