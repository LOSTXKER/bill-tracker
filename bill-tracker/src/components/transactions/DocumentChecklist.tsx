"use client";

import { useState } from "react";
import { Check, Circle, Loader2, Undo2, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { WORKFLOW_STATUS_INFO } from "@/lib/constants/transaction";
import { buildChecklistItems } from "@/lib/workflow/build-checklist-input";
import type { ChecklistItem } from "@/lib/workflow/checklist";
import { formatThaiDate } from "@/lib/utils/tax-calculator";

interface DocumentChecklistProps {
  transactionType: "expense" | "income";
  transaction: {
    id: string;
    workflowStatus: string;
    documentType?: string | null;
    isWht?: boolean;
    isWhtDeducted?: boolean;
    hasTaxInvoice?: boolean;
    taxInvoiceAt?: Date | string | null;
    taxInvoiceRequestedAt?: Date | string | null;
    hasWhtCert?: boolean;
    whtCertIssuedAt?: Date | string | null;
    whtCertSentAt?: Date | string | null;
    hasInvoice?: boolean;
    invoiceIssuedAt?: Date | string | null;
    invoiceSentAt?: Date | string | null;
    whtCertReceivedAt?: Date | string | null;
  };
  companyCode: string;
  onAction?: (action: string) => Promise<void>;
  compact?: boolean;
}

export function DocumentChecklist({
  transactionType,
  transaction,
  onAction,
  compact = false,
}: DocumentChecklistProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const status = transaction.workflowStatus;
  const statusInfo = WORKFLOW_STATUS_INFO[status];
  const isActive = status === "ACTIVE";

  const items: ChecklistItem[] = buildChecklistItems(
    transaction as Record<string, unknown>,
    transactionType,
  );

  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPercent = (completedCount / totalCount) * 100;
  const allDone = completedCount === totalCount;

  const handleAction = async (action: string) => {
    if (!onAction || loadingAction) return;
    setLoadingAction(action);
    try {
      await onAction(action);
    } finally {
      setLoadingAction(null);
    }
  };

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return null;
    return formatThaiDate(new Date(d));
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completedCount}/{totalCount}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              statusInfo?.dotColor || "bg-muted-foreground/40"
            )}
          />
          <span className="text-sm font-medium">
            {statusInfo?.label || status}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Checklist items */}
      <div className="px-4 py-1">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0"
          >
            {item.completed ? (
              <div className="h-5 w-5 rounded-full bg-foreground/80 flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 text-background" />
              </div>
            ) : (
              <Circle className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive ? "text-muted-foreground/50" : "text-muted-foreground/25"
              )} />
            )}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm",
                  item.completed
                    ? "text-muted-foreground line-through decoration-muted-foreground/40"
                    : isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
              {item.completed && item.completedAt && (
                <span className="ml-2 text-xs text-muted-foreground/60">
                  {formatDate(item.completedAt)}
                </span>
              )}
            </div>

            {item.completed && item.undoAction && isActive && onAction && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                disabled={!!loadingAction}
                onClick={() => handleAction(item.undoAction!)}
                title="ยกเลิก"
              >
                {loadingAction === item.undoAction ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {!item.completed && item.action && isActive && onAction && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={!!loadingAction}
                onClick={() => handleAction(item.action!)}
              >
                {loadingAction === item.action ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  item.actionLabel
                )}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {isActive && !allDone && (
        <div className="px-4 py-2.5 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            เหลืออีก {totalCount - completedCount} รายการ จึงจะพร้อมส่งบัญชี
          </p>
        </div>
      )}

      {isActive && allDone && (
        <div className="px-4 py-2.5 border-t">
          <p className="text-xs text-foreground/70 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            เอกสารครบแล้ว พร้อมส่งบัญชี
          </p>
        </div>
      )}

      {!isActive && !allDone && (
        <div className="px-4 py-2.5 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {status === "DRAFT" || status === "PENDING_APPROVAL"
              ? `ต้องทำ ${totalCount} รายการ เมื่อเข้าสถานะดำเนินการ`
              : `เหลือ ${totalCount - completedCount} รายการที่ยังไม่เสร็จ`}
          </p>
        </div>
      )}
    </div>
  );
}
