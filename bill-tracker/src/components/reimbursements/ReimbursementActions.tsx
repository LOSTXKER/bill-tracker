"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import type { Reimbursement } from "@/types/reimbursement";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface ReimbursementActionsProps {
  reimbursement: Reimbursement | null;
  isProcessing?: boolean;
  onApprove?: (id: string) => Promise<boolean>;
  onReject?: (id: string, reason: string) => Promise<boolean>;
  onPay?: (id: string, paymentRef: string, paymentMethod: string) => Promise<boolean>;
  onClose?: () => void;
}

export function ReimbursementActions({
  reimbursement,
  isProcessing = false,
  onApprove,
  onReject,
  onPay,
  onClose,
}: ReimbursementActionsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  const handleReject = async () => {
    if (!reimbursement || !rejectReason.trim()) return;

    const success = await onReject?.(reimbursement.id, rejectReason);
    if (success) {
      setRejectDialogOpen(false);
      setRejectReason("");
      onClose?.();
    }
  };

  const handlePay = async () => {
    if (!reimbursement) return;

    const success = await onPay?.(reimbursement.id, paymentRef, paymentMethod);
    if (success) {
      setPayDialogOpen(false);
      setPaymentRef("");
      setPaymentMethod("BANK_TRANSFER");
      onClose?.();
    }
  };

  const handleApprove = async () => {
    if (!reimbursement) return;

    const success = await onApprove?.(reimbursement.id);
    if (success) {
      onClose?.();
    }
  };

  if (!reimbursement) return null;

  const canApprove = reimbursement.status === "PENDING" || reimbursement.status === "FLAGGED";
  const canPay = reimbursement.status === "APPROVED";

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        {canApprove && (
          <>
            <Button
              variant="outline"
              className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              onClick={() => setRejectDialogOpen(true)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              ปฏิเสธ
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              อนุมัติ
            </Button>
          </>
        )}

        {canPay && (
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => setPayDialogOpen(true)}
            disabled={isProcessing}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            จ่ายเงิน
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอเบิกจ่าย</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลในการปฏิเสธเพื่อแจ้งให้ผู้ขอเบิกทราบ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ผู้ขอ</span>
                <span className="font-medium">{reimbursement.requester?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">จำนวนเงิน</span>
                <span className="font-bold text-primary">
                  {formatCurrency(reimbursement.netAmount)}
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="rejectReason">เหตุผล *</Label>
              <Textarea
                id="rejectReason"
                placeholder="เช่น ใบเสร็จไม่ชัดเจน, รายการไม่เกี่ยวข้องกับงาน, ยอดเงินไม่ตรง"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              ยืนยันปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการจ่ายเงินคืน</DialogTitle>
            <DialogDescription>
              ยืนยันการจ่ายเงินและบันทึกรายละเอียด
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary with Bank Info */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ผู้รับเงิน</span>
                <span className="font-medium">{reimbursement.requester?.name}</span>
              </div>
              {reimbursement.bankInfo && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ธนาคาร</span>
                    <span>{reimbursement.bankInfo.bankName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">เลขบัญชี</span>
                    <span className="font-mono">{reimbursement.bankInfo.bankAccountNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ชื่อบัญชี</span>
                    <span>{reimbursement.bankInfo.bankAccountName}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground font-medium">จำนวนเงิน</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(reimbursement.netAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>วิธีการจ่าย</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">🏦 โอนเงิน</SelectItem>
                  <SelectItem value="CASH">💵 เงินสด</SelectItem>
                  <SelectItem value="PROMPTPAY">📱 พร้อมเพย์</SelectItem>
                  <SelectItem value="CHEQUE">📝 เช็ค</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label htmlFor="paymentRef">เลขอ้างอิง / หมายเหตุ (ถ้ามี)</Label>
              <Input
                id="paymentRef"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="เช่น เลขที่โอน, เลขที่เช็ค, หมายเหตุ"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
              disabled={isProcessing}
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              ยืนยันจ่ายเงิน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Batch Pay Dialog
interface BatchPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedTotal: number;
  isProcessing?: boolean;
  onConfirm: (paymentRef: string, paymentMethod: string) => void;
}

export function BatchPayDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedTotal,
  isProcessing = false,
  onConfirm,
}: BatchPayDialogProps) {
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  const handleConfirm = () => {
    onConfirm(paymentRef, paymentMethod);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>จ่ายเงินหลายรายการ</DialogTitle>
          <DialogDescription>
            จ่ายเงิน {selectedCount} รายการ · รวม {formatCurrency(selectedTotal)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>วิธีการจ่าย</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">🏦 โอนเงิน</SelectItem>
                <SelectItem value="CASH">💵 เงินสด</SelectItem>
                <SelectItem value="PROMPTPAY">📱 พร้อมเพย์</SelectItem>
                <SelectItem value="CHEQUE">📝 เช็ค</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchPaymentRef">เลขอ้างอิง / หมายเหตุ (ถ้ามี)</Label>
            <Input
              id="batchPaymentRef"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="เช่น เลขที่โอน, วันที่จ่าย"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            ยกเลิก
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            ยืนยันจ่ายเงิน ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
