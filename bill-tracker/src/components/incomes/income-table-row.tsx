"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useLineNotification } from "@/hooks/use-line-notification";
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
  };
  companyCode: string;
}

export function IncomeTableRow({ income, companyCode }: IncomeTableRowProps) {
  const router = useRouter();
  const { sending, sendNotification } = useLineNotification("income");

  const handleClick = () => {
    router.push(`/${companyCode.toLowerCase()}/incomes/${income.id}`);
  };

  const handleSendNotification = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    await sendNotification(income.id);
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={handleClick}
    >
      <TableCell className="whitespace-nowrap">
        {formatThaiDate(income.receiveDate)}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">
            {income.contact?.name || "ไม่ระบุผู้ติดต่อ"}
          </p>
          {income.source && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {income.source}
            </p>
          )}
        </div>
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
      <TableCell className="text-center">
        <StatusBadge status={income.status} type="income" />
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
