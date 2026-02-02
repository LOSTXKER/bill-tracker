/**
 * Hook for calculating workflow status information for selected transactions
 * Extracted from TransactionListClient to reduce component complexity
 */

import { useMemo } from "react";
import { getNextStatus, getPreviousStatus, getStatusLabel, type TransactionWorkflowContext } from "@/lib/workflow/status-rules";

export interface Transaction {
  id: string;
  workflowStatus?: string;
  status?: string;
  isWht?: boolean;
  isWhtDeducted?: boolean;
  documentType?: string | null;
  approvalStatus?: string;
}

export interface UseStatusCalculationsProps {
  selectedItems: Transaction[];
  transactionType: "expense" | "income";
  isOwner: boolean;
}

export function useStatusCalculations({
  selectedItems,
  transactionType,
  isOwner,
}: UseStatusCalculationsProps) {
  // Calculate unique statuses of selected items
  const selectedStatuses = useMemo(() => {
    const statuses = new Set(
      selectedItems.map(item => item.workflowStatus || item.status)
    );
    return Array.from(statuses);
  }, [selectedItems]);

  // Calculate workflow context for selected items
  const selectedWorkflowContext = useMemo((): TransactionWorkflowContext | null => {
    if (selectedItems.length === 0) return null;
    
    // For bulk operations, check if all items have consistent context
    const whtValues = new Set(
      selectedItems.map(item => 
        transactionType === "expense" ? item.isWht : item.isWhtDeducted
      )
    );
    
    const docTypeValues = transactionType === "expense" 
      ? new Set(selectedItems.map(item => item.documentType || null))
      : new Set([null]);
    
    // If items have different settings, return most restrictive context
    if (whtValues.size > 1 || docTypeValues.size > 1) {
      return {
        isWht: false,
        isWhtDeducted: false,
        documentType: null,
      };
    }
    
    // All items have the same settings
    const firstItem = selectedItems[0];
    return {
      isWht: firstItem.isWht ?? false,
      isWhtDeducted: firstItem.isWhtDeducted ?? false,
      documentType: (firstItem.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT" | null) ?? null,
    };
  }, [selectedItems, transactionType]);

  // Calculate next status (only if all selected items have the same status)
  const nextStatus = useMemo(() => {
    if (selectedStatuses.length !== 1 || !selectedStatuses[0]) return null;
    return getNextStatus(selectedStatuses[0], transactionType, selectedWorkflowContext || undefined);
  }, [selectedStatuses, transactionType, selectedWorkflowContext]);

  // Calculate previous status (only for owners)
  const previousStatus = useMemo(() => {
    if (selectedStatuses.length !== 1 || !isOwner || !selectedStatuses[0]) return null;
    return getPreviousStatus(selectedStatuses[0], transactionType, selectedWorkflowContext || undefined);
  }, [selectedStatuses, transactionType, selectedWorkflowContext, isOwner]);

  // Get current status label
  const currentStatusLabel = useMemo(() => {
    if (selectedStatuses.length !== 1 || !selectedStatuses[0]) return undefined;
    return getStatusLabel(selectedStatuses[0], transactionType);
  }, [selectedStatuses, transactionType]);

  // Check if selected items include pending approval status
  const hasPendingItems = useMemo(() => {
    return selectedItems.some(item => item.approvalStatus === "PENDING");
  }, [selectedItems]);

  return {
    selectedStatuses,
    selectedWorkflowContext,
    nextStatus,
    previousStatus,
    currentStatusLabel,
    hasPendingItems,
  };
}
