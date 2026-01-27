"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { ApprovalBadge } from "./ApprovalBadge";
import type { ApprovalStatus } from "@prisma/client";

interface QuickApprovalCellProps {
  transactionId: string;
  transactionType: "expense" | "income";
  approvalStatus: ApprovalStatus;
  submittedBy?: string | null;
  currentUserId?: string;
  canApprove?: boolean;
  onSuccess?: () => void;
}

export function QuickApprovalCell({
  transactionId,
  transactionType,
  approvalStatus,
  submittedBy,
  currentUserId,
  canApprove = false,
  onSuccess,
}: QuickApprovalCellProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Don't show anything for NOT_REQUIRED status
  if (approvalStatus === "NOT_REQUIRED") {
    return <span className="text-muted-foreground/50">-</span>;
  }

  // Show badge for non-PENDING statuses
  if (approvalStatus !== "PENDING") {
    return <ApprovalBadge status={approvalStatus} size="sm" />;
  }

  // For PENDING: check if user can approve
  const isSelfSubmitted = submittedBy === currentUserId;
  const showApprovalButtons = canApprove && !isSelfSubmitted && currentUserId;

  // If user can't approve, just show pending badge with tooltip
  if (!showApprovalButtons) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded text-xs">
              <Clock className="h-3 w-3" />
              รออนุมัติ
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isSelfSubmitted 
              ? "คุณไม่สามารถอนุมัติรายการที่ส่งเองได้" 
              : "รอการอนุมัติจากผู้มีสิทธิ์"
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsApproving(true);
    try {
      const res = await fetch(`/api/${transactionType}s/${transactionId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการอนุมัติ");
      }

      toast.success("อนุมัติรายการแล้ว");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/${transactionType}s/${transactionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการปฏิเสธ");
      }

      toast.success("ปฏิเสธรายการแล้ว");
      setShowRejectDialog(false);
      setRejectReason("");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>อนุมัติ</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRejectDialog(true);
                }}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>ปฏิเสธ</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>ปฏิเสธรายการ</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลในการปฏิเสธ เหตุผลจะถูกส่งแจ้งไปยังผู้ส่งคำขอ
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="ระบุเหตุผลในการปฏิเสธ..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              ยืนยันปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
