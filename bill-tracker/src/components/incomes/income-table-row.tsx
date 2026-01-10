"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserBadge } from "@/components/shared/UserBadge";
import { useTransactionRow } from "@/hooks/use-transaction-row";
import { Send, Loader2 } from "lucide-react";

interface IncomeTableRowProps {
  income: {
    id: string;
    receiveDate: Date;
    source: string | null;
    netReceived: number;
    isWhtDeducted: boolean;
    whtRate: number | null;
    status: string;
    contact: { name: string } | null;
    account?: { id: string; code: string; name: string } | null;
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

export function IncomeTableRow({ 
  income, 
  companyCode,
  selected = false,
  onToggleSelect
}: IncomeTableRowProps) {
  const { handleRowClick, handleSendNotification, sending } = useTransactionRow({
    companyCode,
    transactionType: "income",
    transactionId: income.id,
  });

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
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
      <TableCell className="whitespace-nowrap">
        {formatThaiDate(income.receiveDate)}
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={income.status} type="income" />
      </TableCell>
      <TableCell>
        <p className="font-medium">
          {income.contact?.name || "ไม่ระบุผู้ติดต่อ"}
        </p>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {income.account ? `${income.account.code} ${income.account.name}` : "-"}
      </TableCell>
      <TableCell>
        {income.source ? (
          <p className="text-sm text-muted-foreground truncate max-w-xs">
            {income.source}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {income.creator ? (
          <UserBadge user={income.creator} showEmail />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right font-medium text-primary">
        {formatCurrency(income.netReceived)}
      </TableCell>
      <TableCell className="text-center">
        {income.isWhtDeducted ? (
          <Badge variant="outline" className="text-xs">
            {income.whtRate}%
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
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
