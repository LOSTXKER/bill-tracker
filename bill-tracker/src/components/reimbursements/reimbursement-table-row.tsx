"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { UserBadge } from "@/components/shared/UserBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useTransactionRow } from "@/hooks/use-transaction-row";
import { ShieldAlert } from "lucide-react";

interface ReimbursementTableRowProps {
  reimbursement: {
    id: string;
    billDate: Date | string;
    description: string | null;
    netPaid: number | bigint | { toNumber?: () => number };
    reimbursementStatus: string;
    fraudScore: number | null;
    account: { code: string; name: string } | null;
    requester?: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    } | null;
  };
  companyCode: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  showRequester?: boolean;
}

export function ReimbursementTableRow({
  reimbursement,
  companyCode,
  selected = false,
  onToggleSelect,
  showRequester = true,
}: ReimbursementTableRowProps) {
  const { handleRowClick } = useTransactionRow({
    companyCode,
    transactionType: "reimbursement",
    transactionId: reimbursement.id,
  });

  const netPaid = toNumber(reimbursement.netPaid);
  const billDate = typeof reimbursement.billDate === 'string' 
    ? new Date(reimbursement.billDate) 
    : reimbursement.billDate;

  const getFraudScoreColor = (score: number | null) => {
    if (score === null) return "";
    if (score < 30) return "text-emerald-600";
    if (score < 60) return "text-amber-600";
    return "text-red-600";
  };

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
        {formatThaiDate(billDate)}
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={reimbursement.reimbursementStatus} type="reimbursement" />
      </TableCell>
      {showRequester && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {reimbursement.requester ? (
            <span className="text-sm font-medium">{reimbursement.requester.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-muted-foreground">
        {reimbursement.account ? `${reimbursement.account.code} ${reimbursement.account.name}` : "-"}
      </TableCell>
      <TableCell>
        {reimbursement.description ? (
          <p className="text-sm text-foreground truncate max-w-xs">
            {reimbursement.description}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">ไม่ระบุ</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {reimbursement.fraudScore !== null ? (
          <div className={`flex items-center justify-center gap-1 text-sm font-medium ${getFraudScoreColor(reimbursement.fraudScore)}`}>
            <ShieldAlert className="h-3.5 w-3.5" />
            {reimbursement.fraudScore}%
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right font-semibold text-blue-600">
        {formatCurrency(netPaid)}
      </TableCell>
    </TableRow>
  );
}
