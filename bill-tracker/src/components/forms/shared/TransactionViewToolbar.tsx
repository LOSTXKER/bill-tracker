"use client";

import { useState } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Loader2,
  Calendar,
  Send,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatThaiDateLong } from "@/lib/utils/tax-calculator";
import {
  WORKFLOW_STATUS_INFO,
  getExpenseWorkflowLabel,
  type StatusInfo,
} from "@/lib/constants/transaction";
import {
  DraftActions,
  ApprovalBadge,
  ApprovalActions,
  WorkflowActions,
  WorkflowStepper,
} from "@/components/transactions";
import { buildChecklistItems } from "@/lib/workflow/build-checklist-input";
import type { ApprovalStatus, WorkflowStatus } from "@prisma/client";
import type { BaseTransaction } from "../hooks/useTransactionForm";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";

function ActiveStatusCTA({
  config,
  transaction,
  companyCode,
  onActionComplete,
}: {
  config: UnifiedTransactionConfig;
  transaction: BaseTransaction;
  companyCode: string;
  onActionComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const items = buildChecklistItems(transaction as Record<string, unknown>, config.type);

  const totalCount = items.length;
  const completedCount = items.filter(i => i.completed).length;
  const allDone = totalCount === 0 || completedCount === totalCount;
  const remaining = totalCount - completedCount;

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: config.type,
          transactionId: transaction.id,
          action: "mark_ready_for_accounting",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "เกิดข้อผิดพลาด");
      }
      toast.success("เปลี่ยนสถานะเป็นพร้อมส่งบัญชีแล้ว");
      onActionComplete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <LoadingButton
        onClick={handleClick}
        loading={loading}
        disabled={!allDone}
        size="sm"
        className={cn(
          "gap-1.5",
          allDone
            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
        title={!allDone ? `เหลืออีก ${remaining} รายการในเช็คลิสต์` : undefined}
      >
        <Send className="h-3.5 w-3.5" />
        พร้อมส่งบัญชี
      </LoadingButton>
      {!allDone && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          เหลือ {remaining}/{totalCount}
        </span>
      )}
    </div>
  );
}

interface TransactionViewToolbarProps {
  config: UnifiedTransactionConfig;
  transaction: BaseTransaction;
  mode: "view" | "edit";
  saving: boolean;
  companyCode: string;
  currentUserId?: string;
  isOwner: boolean;
  hasPermission: (perm: string) => boolean;
  canCreateDirect: boolean;
  canMarkPaid: boolean;
  onNavigateToList: () => void;
  onEditClick: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDeleteClick: () => void;
  onRefreshAll: () => void;
}

export function TransactionViewToolbar({
  config,
  transaction,
  mode,
  saving,
  companyCode,
  currentUserId,
  isOwner,
  hasPermission: checkPermission,
  canCreateDirect,
  canMarkPaid,
  onNavigateToList,
  onEditClick,
  onCancelEdit,
  onSave,
  onDeleteClick,
  onRefreshAll,
}: TransactionViewToolbarProps) {
  const statusInfo: StatusInfo | null = transaction.workflowStatus
    ? WORKFLOW_STATUS_INFO[transaction.workflowStatus]
    : config.statusInfo[transaction.status];
  const isDeleted = !!transaction.deletedAt;

  return (
    <div className="max-w-6xl mx-auto px-4 mb-4">
      {isDeleted && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-3 flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive text-sm">รายการนี้ถูกลบแล้ว</p>
            <p className="text-xs text-muted-foreground">
              ลบเมื่อ {new Date(transaction.deletedAt as string).toLocaleString(APP_LOCALE, { timeZone: APP_TIMEZONE })}
              {transaction.deletedByUser && ` โดย ${transaction.deletedByUser.name}`}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn("shrink-0 gap-1.5 px-2", config.iconColor)}
            onClick={onNavigateToList}
            aria-label={config.type === "expense" ? "กลับไปหน้ารายจ่าย" : "กลับไปหน้ารายรับ"}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-sm font-medium">
              {config.type === "expense" ? "รายจ่าย" : "รายรับ"}
            </span>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{config.title}</h1>
              {transaction.workflowStatus === "PENDING_APPROVAL" ? (
                <ApprovalBadge status="PENDING" size="sm" />
              ) : transaction.workflowStatus === "DRAFT" && transaction.approvalStatus === "REJECTED" ? (
                <ApprovalBadge status="REJECTED" size="sm" />
              ) : statusInfo && (
                <Badge className={cn("text-xs", statusInfo.bgColor, statusInfo.color)}>
                  {config.type === "expense" && transaction.workflowStatus
                    ? getExpenseWorkflowLabel(transaction.workflowStatus, (transaction.documentType as string) || "TAX_INVOICE")
                    : statusInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatThaiDateLong(new Date(transaction[config.fields.dateField.name] as string))}
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
            <>
              {/* DRAFT or PENDING_APPROVAL: show DraftActions & ApprovalActions */}
              {(transaction.workflowStatus === "DRAFT" || transaction.workflowStatus === "PENDING_APPROVAL") && (
                <DraftActions
                  companyCode={companyCode}
                  transactionId={transaction.id}
                  transactionType={config.type}
                  workflowStatus={(transaction.workflowStatus || "DRAFT") as WorkflowStatus}
                  approvalStatus={
                    transaction.workflowStatus === "PENDING_APPROVAL"
                      ? "PENDING" as ApprovalStatus
                      : (transaction.approvalStatus as ApprovalStatus) || "NOT_REQUIRED"
                  }
                  rejectedReason={transaction.rejectedReason as string | null}
                  submittedAt={transaction.submittedAt as string | null}
                  submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
                  canCreateDirect={canCreateDirect}
                  canMarkPaid={canMarkPaid}
                  onSuccess={onRefreshAll}
                />
              )}
              {transaction.workflowStatus === "PENDING_APPROVAL" && currentUserId && (
                <ApprovalActions
                  transactionId={transaction.id}
                  transactionType={config.type}
                  approvalStatus={(transaction.approvalStatus as ApprovalStatus) || "PENDING"}
                  submittedBy={transaction.submittedBy as string | null}
                  currentUserId={currentUserId}
                  canApprove={checkPermission(`${config.type}s:approve`)}
                  onSuccess={onRefreshAll}
                />
              )}

              {/* ACTIVE: show "พร้อมส่งบัญชี" button, disabled until checklist is complete */}
              {transaction.workflowStatus === "ACTIVE" && (
                <ActiveStatusCTA
                  config={config}
                  transaction={transaction}
                  companyCode={companyCode}
                  onActionComplete={onRefreshAll}
                />
              )}

              {/* Other post-ACTIVE statuses: show WorkflowActions dropdown */}
              {transaction.workflowStatus && transaction.workflowStatus !== "DRAFT" && transaction.workflowStatus !== "PENDING_APPROVAL" && transaction.workflowStatus !== "ACTIVE" && (
                <WorkflowActions
                  companyCode={companyCode}
                  type={config.type}
                  transactionId={transaction.id}
                  currentStatus={transaction.workflowStatus}
                  isWht={config.type === "expense" ? transaction.isWht : undefined}
                  isWhtDeducted={config.type === "income" ? transaction.isWhtDeducted : undefined}
                  documentType={config.type === "expense" ? (transaction.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") : undefined}
                  taxInvoiceRequestedAt={config.type === "expense" ? (transaction.taxInvoiceRequestedAt as string | null | undefined) : undefined}
                  onActionComplete={onRefreshAll}
                  variant="compact"
                  isOwner={isOwner}
                />
              )}

              {/* Inline buttons for desktop */}
              <Button variant="outline" size="sm" onClick={onEditClick} className="hidden sm:inline-flex">
                <Edit className="h-4 w-4 mr-1" />
                แก้ไข
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteClick}
                className="hidden sm:inline-flex text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                ลบ
              </Button>

              {/* Overflow menu for mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEditClick}>
                    <Edit className="h-4 w-4 mr-2" />
                    แก้ไข
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDeleteClick}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {transaction.workflowStatus && (
        <div className="pb-2 pt-1">
          <WorkflowStepper currentStatus={transaction.workflowStatus} />
        </div>
      )}

    </div>
  );
}
