"use client";

import type { ActionConfig } from "./types";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { ArrowLeft } from "lucide-react";
import { DELIVERY_METHODS } from "@/lib/constants/delivery-methods";

export function ConfirmDialog({
  action,
  notes,
  setNotes,
  loading,
  onConfirm,
  onCancel,
  deliveryMethod,
  setDeliveryMethod,
}: {
  action: ActionConfig | null;
  notes: string;
  setNotes: (notes: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  deliveryMethod?: string;
  setDeliveryMethod?: (method: string) => void;
}) {
  if (!action) return null;

  const isSendWht = action.action === "send_wht";

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action.icon}
            {action.label}
          </DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isSendWht && setDeliveryMethod && (
            <div>
              <Label>วิธีส่ง</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DELIVERY_METHODS.map((method) => {
                  const Icon = method.Icon;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={deliveryMethod === method.value ? "default" : "outline"}
                      className="justify-start gap-2 h-auto py-3"
                      onClick={() => setDeliveryMethod(method.value)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{method.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

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
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            ยกเลิก
          </Button>
          <LoadingButton
            onClick={onConfirm}
            loading={loading}
            disabled={isSendWht && !deliveryMethod}
          >
            ยืนยัน
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RevertConfirmDialog({
  open,
  onOpenChange,
  statusLabel,
  previousStatusLabel,
  notes,
  setNotes,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusLabel: string;
  previousStatusLabel: string;
  notes: string;
  setNotes: (notes: string) => void;
  loading: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-amber-600" />
            ย้อนสถานะ
          </DialogTitle>
          <DialogDescription>
            ต้องการย้อนสถานะจาก <strong>&quot;{statusLabel}&quot;</strong> กลับไปเป็น{" "}
            <strong>&quot;{previousStatusLabel}&quot;</strong> ใช่หรือไม่?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="revert-notes">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="revert-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เหตุผลในการย้อนสถานะ..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ยกเลิก
          </Button>
          <LoadingButton
            onClick={onConfirm}
            loading={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ย้อนสถานะ
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RevertButton({
  previousStatus,
  size,
  loading,
  onClick,
}: {
  previousStatus: { label: string } | null;
  size?: "sm" | "default";
  loading: boolean;
  onClick: () => void;
}) {
  if (!previousStatus) return null;
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={loading}
      className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
    >
      <ArrowLeft className="h-4 w-4" />
      {previousStatus.label}
    </Button>
  );
}

export function WorkflowDialogs({
  confirmDialog,
  notes,
  setNotes,
  loading,
  executeAction,
  resetConfirm,
  deliveryMethod,
  setDeliveryMethod,
  showRevertConfirm,
  setShowRevertConfirm,
  statusLabel,
  previousStatusLabel,
  onRevert,
}: {
  confirmDialog: ActionConfig | null;
  notes: string;
  setNotes: (notes: string) => void;
  loading: boolean;
  executeAction: (action: string, notes: string) => void;
  resetConfirm: () => void;
  deliveryMethod: string;
  setDeliveryMethod: (method: string) => void;
  showRevertConfirm: boolean;
  setShowRevertConfirm: (open: boolean) => void;
  statusLabel: string;
  previousStatusLabel: string;
  onRevert: () => void;
}) {
  return (
    <>
      <ConfirmDialog
        action={confirmDialog}
        notes={notes}
        setNotes={setNotes}
        loading={loading}
        onConfirm={() => executeAction(confirmDialog?.action ?? "", notes)}
        onCancel={resetConfirm}
        deliveryMethod={deliveryMethod}
        setDeliveryMethod={setDeliveryMethod}
      />
      <RevertConfirmDialog
        open={showRevertConfirm}
        onOpenChange={setShowRevertConfirm}
        statusLabel={statusLabel}
        previousStatusLabel={previousStatusLabel}
        notes={notes}
        setNotes={setNotes}
        loading={loading}
        onConfirm={onRevert}
      />
    </>
  );
}
