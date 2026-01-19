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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ApprovalStatus } from "@prisma/client";

interface ApprovalActionsProps {
  transactionId: string;
  transactionType: "expense" | "income";
  approvalStatus: ApprovalStatus;
  submittedBy?: string | null;
  currentUserId: string;
  canApprove?: boolean;
  onSuccess?: () => void;
}

export function ApprovalActions({
  transactionId,
  transactionType,
  approvalStatus,
  submittedBy,
  currentUserId,
  canApprove = false,
  onSuccess,
}: ApprovalActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Only show actions for PENDING status
  if (approvalStatus !== "PENDING") {
    return null;
  }

  // Only show if user has permission and is not the submitter
  if (!canApprove || submittedBy === currentUserId) {
    if (submittedBy === currentUserId) {
      return (
        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
          คุณไม่สามารถอนุมัติรายการที่คุณส่งเองได้
        </div>
      );
    }
    return null;
  }

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/${transactionType}s/${transactionId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการอนุมัติ");
      }

      toast.success(data.message || "อนุมัติรายการแล้ว");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการปฏิเสธ");
      }

      toast.success(data.message || "ปฏิเสธรายการแล้ว");
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
      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          disabled={isApproving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          อนุมัติ
        </Button>
        <Button
          onClick={() => setShowRejectDialog(true)}
          variant="destructive"
          disabled={isRejecting}
        >
          {isRejecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          ปฏิเสธ
        </Button>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธรายการ</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลในการปฏิเสธรายการนี้ เหตุผลจะถูกส่งแจ้งไปยังผู้ส่งคำขอ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">เหตุผล</Label>
              <Textarea
                id="rejectReason"
                placeholder="ระบุเหตุผลในการปฏิเสธ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
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
