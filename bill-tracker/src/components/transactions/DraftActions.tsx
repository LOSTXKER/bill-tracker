"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Check,
  Edit,
  Loader2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { ApprovalStatus, ExpenseWorkflowStatus, IncomeWorkflowStatus } from "@prisma/client";

interface DraftActionsProps {
  companyCode: string;
  transactionId: string;
  transactionType: "expense" | "income";
  workflowStatus: ExpenseWorkflowStatus | IncomeWorkflowStatus;
  approvalStatus: ApprovalStatus;
  rejectedReason?: string | null;
  submittedAt?: string | null;
  submittedByName?: string | null;
  canCreateDirect?: boolean;
  canMarkPaid?: boolean;
  onSuccess?: () => void;
}

// Format date for display
function formatSubmittedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

export function DraftActions({
  companyCode,
  transactionId,
  transactionType,
  workflowStatus,
  approvalStatus,
  rejectedReason,
  submittedAt,
  submittedByName,
  canCreateDirect = false,
  canMarkPaid = false,
  onSuccess,
}: DraftActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/${transactionType}s/${transactionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งคำขอ");
      }

      toast.success(data.message || "ดำเนินการสำเร็จ");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsMarkingPaid(true);
    try {
      const endpoint = transactionType === "expense" 
        ? `/api/expenses/${transactionId}/mark-paid`
        : `/api/incomes/${transactionId}/mark-received`;
        
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }

      toast.success(data.message || "บันทึกสำเร็จ");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const res = await fetch(`/api/${transactionType}s/${transactionId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการยกเลิกคำขอ");
      }

      toast.success(data.message || "ยกเลิกคำขออนุมัติแล้ว");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Only show actions for DRAFT status
  if (workflowStatus !== "DRAFT") {
    return null;
  }

  // Different actions based on approval status
  switch (approvalStatus) {
    case "NOT_REQUIRED":
      // Fresh draft - can mark as paid directly (if has permission) or submit for approval
      return (
        <div className="flex gap-2">
          {canCreateDirect ? (
            // User with direct create permission can mark as paid directly
            <Button
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMarkingPaid ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {transactionType === "expense" ? "บันทึกจ่ายเงินแล้ว" : "บันทึกรับเงินแล้ว"}
            </Button>
          ) : (
            // User without direct permission must submit for approval
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant="default"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              ส่งขออนุมัติ
            </Button>
          )}
        </div>
      );

    case "PENDING":
      // Waiting for approval - show status and allow withdraw
      return (
        <div className="flex items-center gap-3">
          <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
            <div className="font-medium">รอการอนุมัติ</div>
            {submittedAt && (
              <div className="text-xs text-amber-500/80 mt-0.5">
                ส่งเมื่อ {formatSubmittedDate(submittedAt)}
                {submittedByName && ` โดย ${submittedByName}`}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            {isWithdrawing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4 mr-1" />
            )}
            ยกเลิกคำขอ
          </Button>
        </div>
      );

    case "APPROVED":
      // Approved - can mark as paid
      return (
        <div className="flex gap-2">
          {canMarkPaid && (
            <Button
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              variant="default"
            >
              {isMarkingPaid ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {transactionType === "expense" ? "บันทึกจ่ายเงินแล้ว" : "บันทึกรับเงินแล้ว"}
            </Button>
          )}
        </div>
      );

    case "REJECTED":
      // Rejected - can edit and resubmit
      return (
        <div className="space-y-2">
          {rejectedReason && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">
              <strong>เหตุผลที่ปฏิเสธ:</strong> {rejectedReason}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to edit page
                window.location.href = `/${transactionType}s/${transactionId}/edit`;
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              แก้ไข
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              ส่งใหม่
            </Button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
