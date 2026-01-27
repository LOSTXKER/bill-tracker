"use client";

/**
 * TransactionViewHeader Component
 * 
 * Renders the header section for view/edit modes of transactions.
 * Includes back navigation, status badges, and action buttons.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Save, X, Trash2, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@prisma/client";
import type { StatusInfo } from "@/lib/constants/transaction";
import { getExpenseWorkflowLabel } from "@/lib/constants/transaction";
import { ApprovalBadge, DraftActions, ApprovalActions, WorkflowActions } from "@/components/transactions";

// =============================================================================
// Types
// =============================================================================

export interface TransactionViewHeaderProps {
  // Config
  transactionType: "expense" | "income";
  title: string;
  iconColor: string;
  companyCode: string;
  
  // Transaction data
  transaction: {
    id: string;
    workflowStatus?: string;
    approvalStatus?: string | null;
    documentType?: string;
    deletedAt?: string | null;
    deletedByUser?: { name?: string } | null;
    submittedBy?: string | null;
    submittedAt?: string | null;
    submittedByUser?: { name?: string } | null;
    rejectedReason?: string | null;
    [key: string]: unknown;
  };
  
  // Mode & permissions
  mode: "view" | "edit";
  isDeleted: boolean;
  currentUserId: string | undefined;
  canCreateDirect: boolean;
  canMarkPaid: boolean;
  hasApprovePermission: boolean;
  
  // Status info
  statusInfo: StatusInfo | null;
  dateFieldName: string;
  
  // Callbacks
  onNavigateBack: () => void;
  onEditClick?: () => void;
  onCancelEdit?: () => void;
  onSave?: () => void;
  onRefresh: () => void;
  
  // State
  saving?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function TransactionViewHeader({
  transactionType,
  title,
  iconColor,
  companyCode,
  transaction,
  mode,
  isDeleted,
  currentUserId,
  canCreateDirect,
  canMarkPaid,
  hasApprovePermission,
  statusInfo,
  dateFieldName,
  onNavigateBack,
  onEditClick,
  onCancelEdit,
  onSave,
  onRefresh,
  saving = false,
}: TransactionViewHeaderProps) {
  const workflowStatus = transaction.workflowStatus || "";
  const approvalStatus = transaction.approvalStatus as ApprovalStatus | null;
  
  // Determine which badge to show
  const showApprovalBadge = 
    workflowStatus === "DRAFT" && 
    (approvalStatus === "PENDING" || approvalStatus === "REJECTED");
  
  // Format date
  const dateValue = transaction[dateFieldName] as string;
  const formattedDate = dateValue 
    ? new Date(dateValue).toLocaleDateString("th-TH", { 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      })
    : "";

  return (
    <div className="max-w-6xl mx-auto px-4 mb-4">
      {/* Deleted Warning Banner */}
      {isDeleted && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-3 flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive text-sm">รายการนี้ถูกลบแล้ว</p>
            <p className="text-xs text-muted-foreground">
              ลบเมื่อ {new Date(transaction.deletedAt as string).toLocaleString("th-TH")}
              {transaction.deletedByUser && ` โดย ${transaction.deletedByUser.name}`}
            </p>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0 rounded-full h-9 w-9", iconColor)}
            onClick={onNavigateBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {/* Show single badge: ApprovalBadge for PENDING/REJECTED, otherwise StatusBadge */}
              {showApprovalBadge ? (
                <ApprovalBadge status={approvalStatus!} size="sm" />
              ) : statusInfo && (
                <Badge className={cn("text-xs", statusInfo.bgColor, statusInfo.color)}>
                  {transactionType === "expense" && workflowStatus
                    ? getExpenseWorkflowLabel(workflowStatus, (transaction.documentType as string) || "TAX_INVOICE")
                    : statusInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDeleted ? (
            <Badge variant="destructive" className="gap-1 text-xs">
              <Trash2 className="h-3 w-3" />
              ถูกลบแล้ว
            </Badge>
          ) : mode === "edit" ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                ยกเลิก
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving} className="bg-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                บันทึก
              </Button>
            </div>
          ) : (
            <TransactionHeaderActions
              transactionType={transactionType}
              companyCode={companyCode}
              transaction={transaction}
              currentUserId={currentUserId}
              canCreateDirect={canCreateDirect}
              canMarkPaid={canMarkPaid}
              hasApprovePermission={hasApprovePermission}
              onEditClick={onEditClick}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface TransactionHeaderActionsProps {
  transactionType: "expense" | "income";
  companyCode: string;
  transaction: TransactionViewHeaderProps["transaction"];
  currentUserId: string | undefined;
  canCreateDirect: boolean;
  canMarkPaid: boolean;
  hasApprovePermission: boolean;
  onEditClick?: () => void;
  onRefresh: () => void;
}

function TransactionHeaderActions({
  transactionType,
  companyCode,
  transaction,
  currentUserId,
  canCreateDirect,
  canMarkPaid,
  hasApprovePermission,
  onEditClick,
  onRefresh,
}: TransactionHeaderActionsProps) {
  const workflowStatus = transaction.workflowStatus || "";
  const approvalStatus = transaction.approvalStatus as ApprovalStatus | null;
  const submittedBy = transaction.submittedBy as string | null;
  
  // DRAFT status with approval workflow
  if (workflowStatus === "DRAFT" && approvalStatus) {
    // PENDING approval
    if (approvalStatus === "PENDING") {
      // Requester: Show only withdraw button
      if (submittedBy === currentUserId) {
        return (
          <DraftActions
            companyCode={companyCode}
            transactionId={transaction.id}
            transactionType={transactionType}
            workflowStatus={workflowStatus}
            approvalStatus={approvalStatus}
            rejectedReason={transaction.rejectedReason as string | null}
            submittedAt={transaction.submittedAt as string | null}
            submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
            canCreateDirect={canCreateDirect}
            canMarkPaid={canMarkPaid}
            onSuccess={onRefresh}
          />
        );
      }
      
      // Approver (not requester): Show only approve/reject buttons
      if (submittedBy !== currentUserId && currentUserId && hasApprovePermission) {
        return (
          <ApprovalActions
            transactionId={transaction.id}
            transactionType={transactionType}
            approvalStatus={approvalStatus}
            submittedBy={submittedBy}
            currentUserId={currentUserId}
            canApprove={true}
            onSuccess={onRefresh}
          />
        );
      }
      
      // Others (not requester, not approver): Show status only
      return (
        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
          รอการอนุมัติ
        </div>
      );
    }
    
    // NOT_REQUIRED or REJECTED: Show DraftActions for owner
    return (
      <DraftActions
        companyCode={companyCode}
        transactionId={transaction.id}
        transactionType={transactionType}
        workflowStatus={workflowStatus}
        approvalStatus={approvalStatus}
        rejectedReason={transaction.rejectedReason as string | null}
        submittedAt={transaction.submittedAt as string | null}
        submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
        canCreateDirect={canCreateDirect}
        canMarkPaid={canMarkPaid}
        onSuccess={onRefresh}
      />
    );
  }
  
  // Non-DRAFT status: Show WorkflowActions with Edit button
  if (workflowStatus && workflowStatus !== "DRAFT") {
    return (
      <div className="flex items-center gap-2">
        {onEditClick && (
          <Button variant="outline" size="sm" onClick={onEditClick}>
            <Edit className="h-4 w-4 mr-1" />
            แก้ไข
          </Button>
        )}
        <WorkflowActions
          companyCode={companyCode}
          transactionId={transaction.id}
          transactionType={transactionType}
          workflowStatus={workflowStatus}
          onActionComplete={onRefresh}
        />
      </div>
    );
  }
  
  // Default: Show edit button
  if (onEditClick) {
    return (
      <Button variant="outline" size="sm" onClick={onEditClick}>
        <Edit className="h-4 w-4 mr-1" />
        แก้ไข
      </Button>
    );
  }
  
  return null;
}
