"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserBadge } from "@/components/shared/UserBadge";
import { useTransactionRow } from "@/hooks/use-transaction-row";
import { Send, Loader2, ShieldAlert } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface TransactionRowConfig {
  type: "expense" | "income";
  dateField: "billDate" | "receiveDate";
  amountField: "netPaid" | "netReceived";
  descriptionField: "description" | "source";
  amountColorClass: string;
  showWhtBadge?: boolean;
  whtField?: "isWht" | "isWhtDeducted";
  whtRateField?: "whtRate";
  showFraudScore?: boolean;
  showRequester?: boolean;
  showCreator?: boolean;
  showLineButton?: boolean;
  statusField?: "status" | "workflowStatus" | "reimbursementStatus";
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
  account?: { id: string; code: string; name: string } | null;
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
  // Fraud score for reimbursement
  fraudScore?: number | null;
}

interface TransactionTableRowProps {
  transaction: TransactionData;
  companyCode: string;
  config: TransactionRowConfig;
  selected?: boolean;
  onToggleSelect?: () => void;
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
  showWhtBadge: false,
  showCreator: true,
  showLineButton: true,
  statusField: "workflowStatus",
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
  showWhtBadge: true,
  whtField: "isWhtDeducted",
  whtRateField: "whtRate",
  showCreator: true,
  showLineButton: true,
  statusField: "workflowStatus",
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
}: TransactionTableRowProps) {
  const { handleRowClick, handleSendNotification, sending } = useTransactionRow({
    companyCode,
    transactionType: config.type,
    transactionId: transaction.id,
  });

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

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
      onClick={handleRowClick}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label="เลือกรายการ"
          />
        </TableCell>
      )}

      {/* Date */}
      <TableCell className="whitespace-nowrap text-foreground">
        {date ? formatThaiDate(date) : "-"}
      </TableCell>

      {/* Status */}
      <TableCell className="text-center">
        <StatusBadge 
          status={status || "PENDING"} 
          type={config.type} 
        />
      </TableCell>

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
            {transaction.contact?.name || "ไม่ระบุผู้ติดต่อ"}
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

      {/* WHT Badge (for income only) */}
      {config.showWhtBadge && (
        <TableCell className="text-center">
          {isWhtEnabled && whtRate ? (
            <Badge variant="outline" className="text-xs">
              {whtRate}%
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
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
    </TableRow>
  );
}
