"use client";

import * as React from "react";
import Link from "next/link";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserBadge } from "@/components/shared/UserBadge";
import { useTransactionRow } from "@/hooks/use-transaction-row";
import { Send, Loader2, ShieldAlert, Receipt, ArrowRightLeft } from "lucide-react";
import { QuickApprovalCell } from "./QuickApprovalCell";
import type { ApprovalStatus } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export interface TransactionRowConfig {
  type: "expense" | "income";
  dateField: "billDate" | "receiveDate";
  amountField: "netPaid" | "netReceived";
  descriptionField: "description" | "source";
  amountColorClass: string;
  showCreatedAt?: boolean;
  showWhtBadge?: boolean;
  whtField?: "isWht" | "isWhtDeducted";
  whtRateField?: "whtRate";
  showFraudScore?: boolean;
  showRequester?: boolean;
  showCreator?: boolean;
  showLineButton?: boolean;
  showInternalCompany?: boolean;
  statusField?: "status" | "workflowStatus" | "reimbursementStatus";
  showApprovalActions?: boolean;
}

export interface TransactionData {
  id: string;
  billDate?: Date | string;
  receiveDate?: Date | string;
  description?: string | null;
  source?: string | null;
  netPaid?: number | bigint | { toNumber?: () => number };
  netReceived?: number | bigint | { toNumber?: () => number };
  status?: string;
  workflowStatus?: string;
  reimbursementStatus?: string;
  contact?: { name: string } | null;
  contactName?: string | null; // One-time contact name (not saved as Contact)
  account?: { id: string; code: string; name: string } | null;
  // Internal company tracking (for expenses that belong to a different company)
  internalCompany?: { id: string; name: string; code: string } | null;
  internalCompanyId?: string | null;
  creator?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  requester?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  // Timestamps
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // WHT fields
  isWht?: boolean;
  isWhtDeducted?: boolean;
  whtRate?: number | null;
  // Document type for expenses (affects status label)
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT" | null;
  // Fraud score for reimbursement
  fraudScore?: number | null;
  // Approval fields
  approvalStatus?: ApprovalStatus | null;
  submittedBy?: string | null;
}

interface TransactionTableRowProps {
  transaction: TransactionData;
  companyCode: string;
  config: TransactionRowConfig;
  selected?: boolean;
  onToggleSelect?: () => void;
  currentUserId?: string;
  canApprove?: boolean;
  onApprovalChange?: () => void;
  onPreview?: (id: string) => void;
}

// =============================================================================
// Expense Config
// =============================================================================

export const expenseRowConfig: TransactionRowConfig = {
  type: "expense",
  dateField: "billDate",
  amountField: "netPaid",
  descriptionField: "description",
  amountColorClass: "text-destructive",
  showCreatedAt: true,
  showWhtBadge: true,
  whtField: "isWht",
  whtRateField: "whtRate",
  showCreator: true,
  showLineButton: true,
  showInternalCompany: true,
  statusField: "workflowStatus",
  showApprovalActions: false,
};

// =============================================================================
// Income Config
// =============================================================================

export const incomeRowConfig: TransactionRowConfig = {
  type: "income",
  dateField: "receiveDate",
  amountField: "netReceived",
  descriptionField: "source",
  amountColorClass: "text-primary",
  showCreatedAt: true,
  showWhtBadge: true,
  whtField: "isWhtDeducted",
  whtRateField: "whtRate",
  showCreator: true,
  showLineButton: true,
  statusField: "workflowStatus",
  showApprovalActions: false,
};

// =============================================================================
// Helper Functions
// =============================================================================

function getFraudScoreColor(score: number | null): string {
  if (score === null) return "";
  if (score < 30) return "text-emerald-600";
  if (score < 60) return "text-amber-600";
  return "text-red-600";
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "เมื่อกี้";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  
  // Show date for older items
  return date.toLocaleDateString("th-TH", { 
    day: "numeric", 
    month: "short" 
  });
}

// =============================================================================
// Component
// =============================================================================

export function TransactionTableRow({
  transaction,
  companyCode,
  config,
  selected = false,
  onToggleSelect,
  currentUserId,
  canApprove = false,
  onApprovalChange,
  onPreview,
}: TransactionTableRowProps) {
  const { handleRowClick, handleSendNotification, sending } = useTransactionRow({
    companyCode,
    transactionType: config.type,
    transactionId: transaction.id,
  });

  // Detail page URL
  const detailPath = config.type === "expense" ? "expenses" : "incomes";
  const detailUrl = `/${companyCode}/${detailPath}/${transaction.id}`;

  // Handle link click — open preview instead of navigating when preview handler is set
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onPreview) {
      e.preventDefault();
      onPreview(transaction.id);
    }
    // Otherwise let Next.js Link handle navigation normally
  };

  // Get date based on config
  const rawDate = config.dateField === "billDate" 
    ? transaction.billDate 
    : transaction.receiveDate;
  const date = typeof rawDate === "string" ? new Date(rawDate) : rawDate;

  // Get amount based on config
  const rawAmount = config.amountField === "netPaid"
    ? transaction.netPaid
    : transaction.netReceived;
  const amount = toNumber(rawAmount);

  // Get description based on config
  const description = config.descriptionField === "description"
    ? transaction.description
    : transaction.source;

  // Get status based on config
  const status = config.statusField === "reimbursementStatus"
    ? transaction.reimbursementStatus
    : config.statusField === "workflowStatus"
    ? transaction.workflowStatus || transaction.status
    : transaction.status;

  // Get WHT info for income
  const isWhtEnabled = config.whtField 
    ? transaction[config.whtField]
    : false;
  const whtRate = config.whtRateField 
    ? transaction[config.whtRateField]
    : null;

  // Render the row as a <Link> with display:table-row so all content is inside <a>,
  // giving browsers native right-click "Open link in new tab" anywhere on the row.
  return (
    <Link
      href={detailUrl}
      onClick={handleLinkClick}
      className="table-row cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <TableCell onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(); }}>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label="เลือกรายการ"
          />
        </TableCell>
      )}

      {/* Created At */}
      {config.showCreatedAt && (
        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
          {transaction.createdAt ? formatThaiDate(new Date(transaction.createdAt)) : "-"}
        </TableCell>
      )}

      {/* Bill/Receive Date */}
      <TableCell className="whitespace-nowrap text-foreground">
        {date ? formatThaiDate(date) : "-"}
      </TableCell>

      {/* Status */}
      <TableCell className="text-center">
        <StatusBadge 
          status={status || "PENDING"} 
          type={config.type}
          documentType={config.type === "expense" ? (transaction.documentType || undefined) : undefined}
          approvalStatus={transaction.approvalStatus}
        />
      </TableCell>

      {/* Approval Actions */}
      {config.showApprovalActions && (
        <TableCell className="text-center">
          <QuickApprovalCell
            transactionId={transaction.id}
            transactionType={config.type}
            approvalStatus={transaction.approvalStatus || "NOT_REQUIRED"}
            submittedBy={transaction.submittedBy}
            currentUserId={currentUserId}
            canApprove={canApprove}
            onSuccess={onApprovalChange}
          />
        </TableCell>
      )}

      {/* Contact (for expense/income) or Requester (for reimbursement) */}
      {config.showRequester ? (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {transaction.requester ? (
            <span className="text-sm font-medium">{transaction.requester.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      ) : (
        <TableCell>
          <p className="font-medium text-foreground">
            {transaction.contact?.name || transaction.contactName || "ไม่ระบุผู้ติดต่อ"}
          </p>
        </TableCell>
      )}

      {/* Account */}
      <TableCell className="text-muted-foreground">
        {transaction.account 
          ? `${transaction.account.code} ${transaction.account.name}` 
          : "-"
        }
      </TableCell>

      {/* Description/Source */}
      <TableCell>
        {description ? (
          <p className="text-sm text-muted-foreground truncate max-w-xs">
            {description}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Internal Company (for expenses recorded under a different company) */}
      {config.showInternalCompany && (
        <TableCell>
          {transaction.internalCompany ? (
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1">
                <ArrowRightLeft className="h-3 w-3" />
                จ่ายแทน
              </Badge>
              <span className="text-xs text-muted-foreground pl-0.5">
                {transaction.internalCompany.code}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground/50">-</span>
          )}
        </TableCell>
      )}

      {/* Creator (for expense/income) */}
      {config.showCreator && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {transaction.creator ? (
            <UserBadge user={transaction.creator} showEmail />
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {/* Fraud Score (for reimbursement) */}
      {config.showFraudScore && (
        <TableCell className="text-center">
          {transaction.fraudScore !== null && transaction.fraudScore !== undefined ? (
            <div className={`flex items-center justify-center gap-1 text-sm font-medium ${getFraudScoreColor(transaction.fraudScore)}`}>
              <ShieldAlert className="h-3.5 w-3.5" />
              {transaction.fraudScore}%
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {/* Amount */}
      <TableCell className={`text-right font-medium ${config.amountColorClass}`}>
        {formatCurrency(amount)}
      </TableCell>

      {/* Updated At - show relative time */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {transaction.updatedAt ? (
          <span 
            title={new Date(transaction.updatedAt).toLocaleString("th-TH")}
            className="inline-flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            {formatRelativeTime(new Date(transaction.updatedAt))}
          </span>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </TableCell>

      {/* WHT Badge */}
      {config.showWhtBadge && (
        <TableCell className="text-center">
          {isWhtEnabled ? (
            <Badge 
              variant="outline" 
              className="text-xs bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
            >
              <Receipt className="h-3 w-3 mr-1" />
              {whtRate ? `${whtRate}%` : "WHT"}
            </Badge>
          ) : (
            <span className="text-muted-foreground/50">-</span>
          )}
        </TableCell>
      )}

      {/* LINE Notification (for expense/income) */}
      {config.showLineButton && (
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendNotification}
            disabled={sending}
            className="h-8 w-8 p-0"
            title="ส่งการแจ้งเตือน LINE"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
      )}
    </Link>
  );
}
