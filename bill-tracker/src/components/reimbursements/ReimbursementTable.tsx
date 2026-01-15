"use client";

import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  ChevronRight,
  Trash2,
} from "lucide-react";
import type { Reimbursement } from "@/types/reimbursement";
import { getStatusConfig } from "@/types/reimbursement";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";

interface ReimbursementTableProps {
  reimbursements: Reimbursement[];
  selectedItems: Set<string>;
  processingIds: Set<string>;
  showCheckbox: boolean;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPay: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ReimbursementTable = memo(function ReimbursementTable({
  reimbursements,
  selectedItems,
  processingIds,
  showCheckbox,
  onToggleSelection,
  onToggleSelectAll,
  onRowClick,
  onApprove,
  onReject,
  onPay,
  onDelete,
}: ReimbursementTableProps) {
  const allSelected = reimbursements.length > 0 && 
    reimbursements.filter(r => r.status === "APPROVED").every(r => selectedItems.has(r.id));

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {showCheckbox && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="w-[100px]">วันที่</TableHead>
            <TableHead className="min-w-[200px]">รายละเอียด</TableHead>
            <TableHead className="w-[120px]">ผู้ขอเบิก</TableHead>
            <TableHead className="w-[120px] text-right">ยอดเงิน</TableHead>
            <TableHead className="w-[100px] text-center">สถานะ</TableHead>
            <TableHead className="w-[140px] text-center">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reimbursements.map((reimbursement) => {
            const statusConfig = getStatusConfig(reimbursement.status);
            const isFlagged = reimbursement.status === "FLAGGED";
            const canApprove = reimbursement.status === "PENDING" || reimbursement.status === "FLAGGED";
            const canPay = reimbursement.status === "APPROVED";
            const canDelete = ["PENDING", "FLAGGED", "REJECTED"].includes(reimbursement.status);
            const isProcessing = processingIds.has(reimbursement.id);
            const isSelected = selectedItems.has(reimbursement.id);

            return (
              <TableRow
                key={reimbursement.id}
                className={`
                  cursor-pointer transition-colors
                  hover:bg-muted/50
                  ${isSelected ? "bg-primary/5" : ""}
                  ${isFlagged ? "bg-red-50/50 dark:bg-red-900/10" : ""}
                  ${isProcessing ? "opacity-60" : ""}
                `}
                onClick={() => onRowClick(reimbursement.id)}
              >
                {/* Checkbox */}
                {showCheckbox && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {reimbursement.status === "APPROVED" && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(reimbursement.id)}
                        disabled={isProcessing}
                      />
                    )}
                  </TableCell>
                )}

                {/* Date */}
                <TableCell className="font-medium text-sm">
                  {formatThaiDate(new Date(reimbursement.billDate))}
                </TableCell>

                {/* Description */}
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium line-clamp-1">
                      {reimbursement.description || "-"}
                    </p>
                    {reimbursement.invoiceNumber && (
                      <p className="text-xs text-muted-foreground">
                        #{reimbursement.invoiceNumber}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Requester */}
                <TableCell>
                  <span className="text-sm">
                    {reimbursement.requester?.name || "-"}
                  </span>
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right">
                  <span className="font-semibold text-primary">
                    {formatCurrency(reimbursement.netAmount)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center">
                  <Badge
                    variant={statusConfig.badgeVariant}
                    className={`${statusConfig.bgColor} ${statusConfig.color} text-xs`}
                  >
                    {statusConfig.label}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    {canApprove && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onReject(reimbursement.id)}
                          disabled={isProcessing}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => onApprove(reimbursement.id)}
                          disabled={isProcessing}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {canPay && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => onPay(reimbursement.id)}
                        disabled={isProcessing}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}

                    {canDelete && onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onDelete(reimbursement.id)}
                        disabled={isProcessing}
                        title="ลบรายการ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    {!canApprove && !canPay && !canDelete && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});
