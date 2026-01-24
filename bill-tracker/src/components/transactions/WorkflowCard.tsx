"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Loader2,
  Receipt,
  FileText,
  Send,
  CheckCircle,
  Bell,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXPENSE_WORKFLOW_INFO,
  INCOME_WORKFLOW_INFO,
} from "@/lib/constants/transaction";

// =============================================================================
// Types
// =============================================================================

interface WorkflowCardProps {
  companyCode: string;
  type: "expense" | "income";
  transactionId: string;
  currentStatus: string;
  isWht?: boolean;
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  onActionComplete?: () => void;
  className?: string;
}

interface ActionConfig {
  action: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  variant?: "default" | "outline" | "secondary";
}

// =============================================================================
// Action Configurations
// =============================================================================

const NEXT_ACTIONS: Record<string, Record<string, ActionConfig>> = {
  expense: {
    PAID: {
      action: "receive_tax_invoice",
      label: "ได้รับใบกำกับภาษีแล้ว",
      icon: <Receipt className="h-4 w-4" />,
      description: "บันทึกว่าได้รับใบกำกับภาษีจากร้านค้า",
    },
    WAITING_TAX_INVOICE: {
      action: "receive_tax_invoice",
      label: "ได้รับใบกำกับภาษีแล้ว",
      icon: <Receipt className="h-4 w-4" />,
      description: "บันทึกว่าได้รับใบกำกับภาษีจากร้านค้า",
    },
    TAX_INVOICE_RECEIVED: {
      action: "issue_wht",
      label: "ออกใบ 50 ทวิแล้ว",
      icon: <FileText className="h-4 w-4" />,
      description: "ออกหนังสือรับรองหัก ณ ที่จ่ายให้ผู้ขาย",
    },
    WHT_PENDING_ISSUE: {
      action: "issue_wht",
      label: "ออกใบ 50 ทวิแล้ว",
      icon: <FileText className="h-4 w-4" />,
      description: "ออกหนังสือรับรองหัก ณ ที่จ่ายให้ผู้ขาย",
    },
    WHT_ISSUED: {
      action: "send_wht",
      label: "ส่งใบ 50 ทวิให้ผู้ขายแล้ว",
      icon: <Send className="h-4 w-4" />,
      description: "ส่งหนังสือรับรองให้ผู้ขาย",
    },
    READY_FOR_ACCOUNTING: {
      action: "send_to_accounting",
      label: "ส่งบัญชีแล้ว",
      icon: <Send className="h-4 w-4" />,
      description: "ส่งเอกสารให้สำนักงานบัญชี",
    },
    SENT_TO_ACCOUNTANT: {
      action: "complete",
      label: "เสร็จสิ้น",
      icon: <CheckCircle className="h-4 w-4" />,
      description: "ปิดรายการนี้",
    },
  },
  income: {
    RECEIVED: {
      action: "issue_invoice",
      label: "ออกใบกำกับภาษีแล้ว",
      icon: <FileText className="h-4 w-4" />,
      description: "ออกใบกำกับภาษี/ใบเสร็จให้ลูกค้า",
    },
    WAITING_INVOICE_ISSUE: {
      action: "issue_invoice",
      label: "ออกใบกำกับภาษีแล้ว",
      icon: <FileText className="h-4 w-4" />,
      description: "ออกใบกำกับภาษี/ใบเสร็จให้ลูกค้า",
    },
    INVOICE_ISSUED: {
      action: "send_invoice",
      label: "ส่งบิลให้ลูกค้าแล้ว",
      icon: <Send className="h-4 w-4" />,
      description: "ส่งใบกำกับภาษีให้ลูกค้า",
    },
    WHT_PENDING_CERT: {
      action: "receive_wht",
      label: "ได้รับใบ 50 ทวิแล้ว",
      icon: <Receipt className="h-4 w-4" />,
      description: "ได้รับหนังสือรับรองหัก ณ ที่จ่ายจากลูกค้า",
    },
    READY_FOR_ACCOUNTING: {
      action: "send_to_accounting",
      label: "ส่งบัญชีแล้ว",
      icon: <Send className="h-4 w-4" />,
      description: "ส่งเอกสารให้สำนักงานบัญชี",
    },
    SENT_TO_ACCOUNTANT: {
      action: "complete",
      label: "เสร็จสิ้น",
      icon: <CheckCircle className="h-4 w-4" />,
      description: "ปิดรายการนี้",
    },
  },
};

const SECONDARY_ACTIONS: Record<string, ActionConfig[]> = {
  WHT_PENDING_CERT: [
    {
      action: "remind_wht",
      label: "ทวงใบ 50 ทวิ",
      icon: <Bell className="h-4 w-4" />,
      description: "ส่งแจ้งเตือนไปยังลูกค้าเพื่อขอใบ 50 ทวิ",
      variant: "outline",
    },
  ],
  TAX_INVOICE_RECEIVED: [
    {
      action: "send_to_accounting",
      label: "ส่งบัญชีเลย (ไม่มี WHT)",
      icon: <Send className="h-4 w-4" />,
      description: "ถ้าไม่มีหัก ณ ที่จ่าย สามารถส่งบัญชีได้เลย",
      variant: "outline",
    },
  ],
};

// =============================================================================
// Helper functions
// =============================================================================

function getStatusIcon(status: string) {
  if (status.includes("WAITING") || status.includes("PENDING")) {
    return <Clock className="h-5 w-5" />;
  }
  if (status === "SENT_TO_ACCOUNTANT" || status === "COMPLETED") {
    return <CheckCircle className="h-5 w-5" />;
  }
  return <FileText className="h-5 w-5" />;
}

function getProgressPercentage(type: string, status: string): number {
  // Status order matches schema enums (ExpenseWorkflowStatus/IncomeWorkflowStatus)
  const expenseOrder = ["DRAFT", "PAID", "WAITING_TAX_INVOICE", "TAX_INVOICE_RECEIVED", "WHT_PENDING_ISSUE", "WHT_ISSUED", "WHT_SENT_TO_VENDOR", "READY_FOR_ACCOUNTING", "SENT_TO_ACCOUNTANT", "COMPLETED"];
  const incomeOrder = ["DRAFT", "RECEIVED", "WAITING_INVOICE_ISSUE", "INVOICE_ISSUED", "INVOICE_SENT", "WHT_PENDING_CERT", "WHT_CERT_RECEIVED", "READY_FOR_ACCOUNTING", "SENT_TO_ACCOUNTANT", "COMPLETED"];
  
  const order = type === "expense" ? expenseOrder : incomeOrder;
  const index = order.indexOf(status);
  if (index === -1) return 0;
  return Math.round((index / (order.length - 1)) * 100);
}

// =============================================================================
// Component
// =============================================================================

export function WorkflowCard({
  companyCode,
  type,
  transactionId,
  currentStatus,
  isWht = false,
  documentType = "TAX_INVOICE",
  onActionComplete,
  className,
}: WorkflowCardProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ActionConfig | null>(null);
  const [notes, setNotes] = useState("");

  const statusInfo = type === "expense" ? EXPENSE_WORKFLOW_INFO : INCOME_WORKFLOW_INFO;
  const currentInfo = statusInfo[currentStatus];
  const nextAction = NEXT_ACTIONS[type]?.[currentStatus];
  const secondaryActions = SECONDARY_ACTIONS[currentStatus] || [];

  // Filter WHT actions if not applicable
  const filteredSecondaryActions = secondaryActions.filter((action) => {
    if (action.action.includes("wht") && !isWht) return false;
    return true;
  });

  const executeAction = async (action: string, actionNotes?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: type,
          transactionId,
          action,
          notes: actionNotes || notes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "เกิดข้อผิดพลาด");
      }

      toast.success("อัปเดตสถานะสำเร็จ");
      setConfirmDialog(null);
      setNotes("");
      onActionComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: ActionConfig) => {
    setConfirmDialog(action);
  };

  const progress = getProgressPercentage(type, currentStatus);
  const isCompleted = currentStatus === "SENT_TO_ACCOUNTANT" || currentStatus === "COMPLETED";
  const isWaiting = currentStatus.includes("WAITING") || currentStatus.includes("PENDING");

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        {/* Progress Bar */}
        <div className="h-1.5 bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-700",
              isCompleted
                ? "bg-emerald-500"
                : isWaiting
                ? "bg-amber-500"
                : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardContent className="p-4">
          {/* Current Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  isCompleted
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                    : isWaiting
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                )}
              >
                {getStatusIcon(currentStatus)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">สถานะปัจจุบัน</p>
                <p className="font-semibold">{currentInfo?.label || currentStatus}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isCompleted
                  ? "border-emerald-500 text-emerald-600"
                  : isWaiting
                  ? "border-amber-500 text-amber-600"
                  : "border-blue-500 text-blue-600"
              )}
            >
              {progress}%
            </Badge>
          </div>

          {/* Next Action - Compact Design */}
          {nextAction && !isCompleted && (
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => handleAction(nextAction)}
                disabled={loading}
                className="w-full h-11 gap-2"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    {nextAction.icon}
                  </>
                )}
                {nextAction.label}
              </Button>

              {/* Secondary Actions */}
              {filteredSecondaryActions.length > 0 && (
                <div className="flex gap-2">
                  {filteredSecondaryActions.map((action) => (
                    <Button
                      key={action.action}
                      onClick={() => handleAction(action)}
                      disabled={loading}
                      variant={action.variant || "outline"}
                      className="flex-1 gap-1.5 text-xs"
                      size="sm"
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <>
              <Separator className="my-4" />
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">ดำเนินการเสร็จสิ้น</span>
                </div>
              </div>
            </>
          )}

          {/* Waiting Warning */}
          {isWaiting && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  {currentStatus === "WAITING_TAX_INVOICE" && (
                    documentType === "CASH_RECEIPT" ? "รอบิลเงินสดจากผู้ขาย" : "รอใบกำกับภาษีจากผู้ขาย"
                  )}
                  {currentStatus === "WHT_PENDING_ISSUE" && "ต้องออกใบ 50 ทวิให้ผู้ขาย"}
                  {currentStatus === "WHT_PENDING_CERT" && "รอใบ 50 ทวิจากลูกค้า"}
                  {currentStatus === "WAITING_INVOICE_ISSUE" && "ต้องออกใบกำกับภาษีให้ลูกค้า"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog?.icon}
              {confirmDialog?.label}
            </DialogTitle>
            <DialogDescription>{confirmDialog?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เพิ่มหมายเหตุ..."
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => executeAction(confirmDialog?.action || "", notes)}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
