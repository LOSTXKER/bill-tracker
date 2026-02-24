"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Loader2,
  Calendar,
  FileText,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeliveryMethod } from "@/lib/constants/delivery-methods";
import {
  EXPENSE_WORKFLOW_INFO,
  INCOME_WORKFLOW_INFO,
  getExpenseWorkflowLabel,
  type StatusInfo,
} from "@/lib/constants/transaction";
import {
  TimelineStepper,
  DraftActions,
  ApprovalBadge,
  ApprovalActions,
  WorkflowActions,
} from "@/components/transactions";
import type { ApprovalStatus } from "@prisma/client";
import type { BaseTransaction } from "../hooks/useTransactionForm";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";
import type { ContactSummary } from "@/types";

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
  selectedContact: ContactSummary | null;
  taxInvoiceRequestMethod: string | null;
  taxInvoiceRequestEmail: string | null;
  taxInvoiceRequestNotes: string | null;
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
  selectedContact,
  taxInvoiceRequestMethod,
  taxInvoiceRequestEmail,
  taxInvoiceRequestNotes,
  onNavigateToList,
  onEditClick,
  onCancelEdit,
  onSave,
  onDeleteClick,
  onRefreshAll,
}: TransactionViewToolbarProps) {
  const workflowInfo = config.type === "expense" ? EXPENSE_WORKFLOW_INFO : INCOME_WORKFLOW_INFO;
  const statusInfo: StatusInfo | null = transaction.workflowStatus
    ? workflowInfo[transaction.workflowStatus]
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
              ลบเมื่อ {new Date(transaction.deletedAt as string).toLocaleString("th-TH")}
              {transaction.deletedByUser && ` โดย ${transaction.deletedByUser.name}`}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0 rounded-full h-9 w-9", config.iconColor)}
            onClick={onNavigateToList}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{config.title}</h1>
              {transaction.workflowStatus === "DRAFT" && transaction.approvalStatus === "PENDING" ? (
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
              {new Date(transaction[config.fields.dateField.name] as string).toLocaleDateString(
                "th-TH",
                { day: "numeric", month: "long", year: "numeric" }
              )}
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
              {transaction.workflowStatus === "DRAFT" && transaction.approvalStatus && (
                <>
                  {transaction.approvalStatus === "PENDING" && (
                    <>
                      {transaction.submittedBy === currentUserId && (
                        <DraftActions
                          companyCode={companyCode}
                          transactionId={transaction.id}
                          transactionType={config.type}
                          workflowStatus={transaction.workflowStatus}
                          approvalStatus={transaction.approvalStatus as ApprovalStatus}
                          rejectedReason={transaction.rejectedReason as string | null}
                          submittedAt={transaction.submittedAt as string | null}
                          submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
                          canCreateDirect={canCreateDirect}
                          canMarkPaid={canMarkPaid}
                          onSuccess={onRefreshAll}
                        />
                      )}
                      {transaction.submittedBy !== currentUserId && currentUserId && checkPermission(`${config.type}s:approve`) && (
                        <ApprovalActions
                          transactionId={transaction.id}
                          transactionType={config.type}
                          approvalStatus={transaction.approvalStatus as ApprovalStatus}
                          submittedBy={transaction.submittedBy as string | null}
                          currentUserId={currentUserId}
                          canApprove={true}
                          onSuccess={onRefreshAll}
                        />
                      )}
                      {transaction.submittedBy !== currentUserId && !checkPermission(`${config.type}s:approve`) && (
                        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
                          รอการอนุมัติ
                        </div>
                      )}
                    </>
                  )}
                  {transaction.approvalStatus !== "PENDING" && (
                    <DraftActions
                      companyCode={companyCode}
                      transactionId={transaction.id}
                      transactionType={config.type}
                      workflowStatus={transaction.workflowStatus}
                      approvalStatus={transaction.approvalStatus as ApprovalStatus}
                      rejectedReason={transaction.rejectedReason as string | null}
                      submittedAt={transaction.submittedAt as string | null}
                      submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
                      canCreateDirect={canCreateDirect}
                      canMarkPaid={canMarkPaid}
                      onSuccess={onRefreshAll}
                    />
                  )}
                </>
              )}
              {transaction.workflowStatus && transaction.workflowStatus !== "DRAFT" && (
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
              <Button variant="outline" size="sm" onClick={onEditClick}>
                <Edit className="h-4 w-4 mr-1" />
                แก้ไข
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteClick}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                ลบ
              </Button>
            </>
          )}
        </div>
      </div>

      {transaction.workflowStatus && (
        <div className="pb-2">
          <TimelineStepper
            type={config.type}
            currentStatus={transaction.workflowStatus}
            isWht={config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted}
            approvalStatus={transaction.approvalStatus as ApprovalStatus | undefined}
            documentType={config.type === "expense" ? (transaction.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT" | undefined) : undefined}
            taxInvoiceRequestedAt={config.type === "expense" ? (transaction.taxInvoiceRequestedAt as string | null | undefined) : undefined}
          />
        </div>
      )}

      {config.type === "expense" && transaction.workflowStatus === "WAITING_TAX_INVOICE" && (() => {
        const method = taxInvoiceRequestMethod || selectedContact?.taxInvoiceRequestMethod;
        const email = taxInvoiceRequestMethod === "email"
          ? (taxInvoiceRequestEmail || selectedContact?.taxInvoiceRequestEmail || selectedContact?.email)
          : (selectedContact?.taxInvoiceRequestEmail || selectedContact?.email);
        const notes = taxInvoiceRequestNotes || selectedContact?.taxInvoiceRequestNotes;
        const phone = selectedContact?.phone;
        const methodInfo = getDeliveryMethod(method);

        return (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                รอใบกำกับภาษี — ช่องทางติดต่อ
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {methodInfo ? (() => {
                const Icon = methodInfo.Icon;
                return (
                  <span className="flex items-center gap-1.5 font-medium text-orange-800 dark:text-orange-200">
                    <Icon className="h-4 w-4" />
                    {methodInfo.label}
                    {method === "email" && email && (
                      <span className="font-normal text-orange-700 dark:text-orange-300">({email})</span>
                    )}
                  </span>
                );
              })() : (
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  ยังไม่ระบุช่องทาง
                </span>
              )}
              {phone && (
                <span className="flex items-center gap-1 text-orange-700 dark:text-orange-300">
                  <Phone className="h-3.5 w-3.5" />
                  {phone}
                </span>
              )}
              {notes && (
                <span className="text-orange-700 dark:text-orange-300">• {notes}</span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
