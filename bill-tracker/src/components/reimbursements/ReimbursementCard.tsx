"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  User,
  Receipt,
  Wallet,
  ChevronRight,
} from "lucide-react";
import type { Reimbursement } from "@/types/reimbursement";
import { getStatusConfig, getFraudScoreColor } from "@/types/reimbursement";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";

interface ReimbursementCardProps {
  reimbursement: Reimbursement;
  isSelected?: boolean;
  isProcessing?: boolean;
  showCheckbox?: boolean;
  showActions?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPay?: () => void;
}

export const ReimbursementCard = memo(function ReimbursementCard({
  reimbursement,
  isSelected = false,
  isProcessing = false,
  showCheckbox = false,
  showActions = true,
  onSelect,
  onClick,
  onApprove,
  onReject,
  onPay,
}: ReimbursementCardProps) {
  const statusConfig = getStatusConfig(reimbursement.status);
  const fraudScoreColor = getFraudScoreColor(reimbursement.fraudScore);
  const isFlagged = reimbursement.status === "FLAGGED";
  const canApprove = reimbursement.status === "PENDING" || reimbursement.status === "FLAGGED";
  const canPay = reimbursement.status === "APPROVED";

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest('[role="checkbox"]')
    ) {
      return;
    }
    onClick?.();
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className={`
        transition-all duration-200 cursor-pointer
        hover:shadow-md hover:border-primary/30
        ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}
        ${isFlagged ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10" : ""}
        ${isProcessing ? "opacity-60 pointer-events-none" : ""}
      `}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header Row - Mobile & Desktop */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {showCheckbox && onSelect && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Top Line: Date, Status, Amount */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {formatThaiDate(new Date(reimbursement.billDate))}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={statusConfig.badgeVariant}
                  className={`${statusConfig.bgColor} ${statusConfig.color} shrink-0`}
                >
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            {/* Amount - Large and prominent */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(reimbursement.netAmount)}
              </div>

              {/* Fraud Score */}
              {reimbursement.fraudScore !== null && (
                <div className={`flex items-center gap-1 text-sm font-medium ${fraudScoreColor}`}>
                  <ShieldAlert className="h-4 w-4" />
                  <span>{reimbursement.fraudScore}%</span>
                </div>
              )}
            </div>

            {/* Description */}
            {reimbursement.description && (
              <div className="flex items-start gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-foreground line-clamp-2">
                  {reimbursement.description}
                </p>
              </div>
            )}

            {/* Requester & Account */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {reimbursement.requester && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">{reimbursement.requester.name}</span>
                </div>
              )}

              {reimbursement.account && (
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>
                    {reimbursement.account.code} - {reimbursement.account.name}
                  </span>
                </div>
              )}
            </div>

            {/* Bank Info for Approved items */}
            {canPay && reimbursement.bankInfo && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <div className="font-medium">{reimbursement.bankInfo.bankAccountName}</div>
                <div>
                  {reimbursement.bankInfo.bankName} {reimbursement.bankInfo.bankAccountNo}
                </div>
              </div>
            )}

            {/* Flagged Warning */}
            {isFlagged && (
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20 rounded p-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>AI ตรวจพบความเสี่ยง - ตรวจสอบก่อนอนุมัติ</span>
              </div>
            )}

            {/* Actions - Mobile Optimized */}
            {showActions && (canApprove || canPay) && (
              <div className="flex gap-2 pt-2">
                {canApprove && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      onClick={(e) => handleActionClick(e, () => onReject?.())}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      ปฏิเสธ
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={(e) => handleActionClick(e, () => onApprove?.())}
                      disabled={isProcessing}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      อนุมัติ
                    </Button>
                  </>
                )}

                {canPay && (
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => handleActionClick(e, () => onPay?.())}
                    disabled={isProcessing}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    จ่ายเงิน
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Chevron for click indicator */}
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
});
