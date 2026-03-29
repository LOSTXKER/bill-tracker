"use client";

import { LoadingButton } from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { getPreviousStatus, type TransactionWorkflowContext } from "@/lib/workflow/status-rules";
import { EXPENSE_WORKFLOW_INFO, INCOME_WORKFLOW_INFO } from "@/lib/constants/transaction";
import type { WorkflowActionsProps } from "./workflow/types";
import { buildFilteredActions } from "./workflow/action-configs";
import { RevertButton, WorkflowDialogs } from "./workflow/ConfirmDialog";
import { useWorkflowActions } from "./workflow/useWorkflowActions";

export function WorkflowActions({
  companyCode,
  type,
  transactionType,
  transactionId,
  currentStatus,
  workflowStatus,
  isWht,
  isWhtDeducted,
  documentType = "TAX_INVOICE",
  taxInvoiceRequestedAt,
  onActionComplete,
  variant = "default",
  isOwner = false,
}: WorkflowActionsProps) {
  const txType = type || transactionType || "expense";
  const status = currentStatus || workflowStatus || "";

  const statusLabel = (() => {
    const info =
      txType === "expense"
        ? EXPENSE_WORKFLOW_INFO[status as keyof typeof EXPENSE_WORKFLOW_INFO]
        : INCOME_WORKFLOW_INFO[status as keyof typeof INCOME_WORKFLOW_INFO];
    return info?.label || status;
  })();

  const workflowContext: TransactionWorkflowContext = {
    isWht: txType === "expense" ? isWht : undefined,
    isWhtDeducted: txType === "income" ? isWhtDeducted : undefined,
    documentType: txType === "expense" ? documentType : undefined,
  };

  const previousStatus = isOwner
    ? getPreviousStatus(status, txType, workflowContext)
    : null;

  const filteredActions = buildFilteredActions({
    txType,
    status,
    documentType,
    isWht,
    taxInvoiceRequestedAt,
  });

  const {
    loading,
    confirmDialog,
    notes,
    setNotes,
    showRevertConfirm,
    setShowRevertConfirm,
    deliveryMethod,
    setDeliveryMethod,
    executeAction,
    handleRevert,
    handleAction,
    resetConfirm,
  } = useWorkflowActions({
    companyCode,
    txType,
    transactionId,
    status,
    statusLabel,
    previousStatus,
    onActionComplete,
  });

  if (filteredActions.length === 0 && !previousStatus) return null;

  const primaryAction = filteredActions[0];
  const secondaryActions = filteredActions.slice(1);
  const btnSize = variant === "compact" ? "sm" : "default";

  const dialogs = (
    <WorkflowDialogs
      confirmDialog={confirmDialog}
      notes={notes}
      setNotes={setNotes}
      loading={loading}
      executeAction={executeAction}
      resetConfirm={resetConfirm}
      deliveryMethod={deliveryMethod}
      setDeliveryMethod={setDeliveryMethod}
      showRevertConfirm={showRevertConfirm}
      setShowRevertConfirm={setShowRevertConfirm}
      statusLabel={statusLabel}
      previousStatusLabel={previousStatus?.label ?? ""}
      onRevert={handleRevert}
    />
  );

  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-2">
          <RevertButton previousStatus={previousStatus} size={btnSize} loading={loading} onClick={() => setShowRevertConfirm(true)} />
          {primaryAction && (
            <LoadingButton
              onClick={() => handleAction(primaryAction)}
              loading={loading}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </LoadingButton>
          )}
          {secondaryActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {secondaryActions.map((action, index) => (
                  <div key={action.action}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => handleAction(action)} disabled={loading}>
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {dialogs}
      </>
    );
  }

  if (filteredActions.length <= 1) {
    return (
      <>
        <div className="flex items-center gap-2">
          <RevertButton previousStatus={previousStatus} size={btnSize} loading={loading} onClick={() => setShowRevertConfirm(true)} />
          {primaryAction && (
            <LoadingButton onClick={() => handleAction(primaryAction)} loading={loading} className="gap-2">
              {primaryAction.icon}
              {primaryAction.label}
            </LoadingButton>
          )}
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <RevertButton previousStatus={previousStatus} size={btnSize} loading={loading} onClick={() => setShowRevertConfirm(true)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <LoadingButton loading={loading} className="gap-2">
              ดำเนินการ
              <ChevronDown className="h-4 w-4" />
            </LoadingButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {filteredActions.map((action, index) => (
              <div key={action.action}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => handleAction(action)} disabled={loading}>
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dialogs}
    </>
  );
}
