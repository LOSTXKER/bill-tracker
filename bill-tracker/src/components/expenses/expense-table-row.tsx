"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/validations/expense";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useTransactionRow } from "@/hooks/use-transaction-row";
import { Send, Loader2 } from "lucide-react";

interface ExpenseTableRowProps {
  expense: {
    id: string;
    billDate: Date;
    description: string | null;
    category: string | null;
    netPaid: number | bigint | { toNumber?: () => number };
    status: string;
    contact: { name: string } | null;
  };
  companyCode: string;
}

export function ExpenseTableRow({ expense, companyCode }: ExpenseTableRowProps) {
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
      <TableCell className="whitespace-nowrap text-foreground">
        {formatThaiDate(expense.billDate)}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">
            {expense.contact?.name || "ไม่ระบุผู้ติดต่อ"}
          </p>
          {expense.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {expense.description}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {expense.category
          ? EXPENSE_CATEGORY_LABELS[expense.category] || expense.category
          : "-"}
      </TableCell>
      <TableCell className="text-right font-medium text-destructive">
        {formatCurrency(netPaid)}
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={expense.status} type="expense" />
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
