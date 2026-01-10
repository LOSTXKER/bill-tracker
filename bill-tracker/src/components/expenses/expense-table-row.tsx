"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserBadge } from "@/components/shared/UserBadge";
import { useTransactionRow } from "@/hooks/use-transaction-row";
import { Send, Loader2 } from "lucide-react";

interface ExpenseTableRowProps {
  expense: {
    id: string;
    billDate: Date;
    description: string | null;
    category: string | null; // deprecated
    account?: { id: string; code: string; name: string } | null;
    netPaid: number | bigint | { toNumber?: () => number };
    status: string;
    contact: { name: string } | null;
    creator?: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    } | null;
  };
  companyCode: string;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ExpenseTableRow({ 
  expense, 
  companyCode,
  selected = false,
  onToggleSelect
}: ExpenseTableRowProps) {
  const { handleRowClick, handleSendNotification, sending } = useTransactionRow({
    companyCode,
    transactionType: "expense",
    transactionId: expense.id,
  });

  // Convert Decimal to number safely
  const netPaid = toNumber(expense.netPaid);

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={handleRowClick}
    >
      {onToggleSelect && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`เลือกรายการ`}
          />
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap text-foreground">
        {formatThaiDate(expense.billDate)}
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={expense.status} type="expense" />
      </TableCell>
      <TableCell>
        <p className="font-medium text-foreground">
          {expense.contact?.name || "ไม่ระบุผู้ติดต่อ"}
        </p>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {expense.account ? `${expense.account.code} ${expense.account.name}` : "-"}
      </TableCell>
      <TableCell>
        {expense.description ? (
          <p className="text-sm text-muted-foreground truncate max-w-xs">
            {expense.description}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {expense.creator ? (
          <UserBadge user={expense.creator} showEmail />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right font-medium text-destructive">
        {formatCurrency(netPaid)}
      </TableCell>
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
    </TableRow>
  );
}
