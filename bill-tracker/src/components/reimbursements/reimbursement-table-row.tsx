"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { UserBadge } from "@/components/shared/UserBadge";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

interface ReimbursementTableRowProps {
  reimbursement: {
    id: string;
    billDate: Date | string;
    description: string | null;
    netPaid: number | bigint | { toNumber?: () => number };
    reimbursementStatus: string;
    fraudScore: number | null;
    categoryRef: { name: string } | null;
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

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "รออนุมัติ",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  FLAGGED: {
    label: "AI พบปัญหา",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertTriangle,
  },
  APPROVED: {
    label: "รอจ่ายเงิน",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Wallet,
  },
  REJECTED: {
    label: "ถูกปฏิเสธ",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายแล้ว",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
};

export function ReimbursementTableRow({
  reimbursement,
  companyCode,
  selected = false,
  onToggleSelect,
  showRequester = true,
}: ReimbursementTableRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/${companyCode.toLowerCase()}/reimbursements/${reimbursement.id}`);
  };

  const netPaid = toNumber(reimbursement.netPaid);
  const status = statusConfig[reimbursement.reimbursementStatus] || statusConfig.PENDING;
  const StatusIcon = status.icon;
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
        <Badge className={`${status.color} border-0 gap-1`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </TableCell>
      {showRequester && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {reimbursement.requester ? (
            <UserBadge user={reimbursement.requester} />
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-muted-foreground">
        {reimbursement.categoryRef?.name || "-"}
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
