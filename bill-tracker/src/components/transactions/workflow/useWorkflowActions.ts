import { useState } from "react";
import { toast } from "sonner";
import type { ActionConfig } from "./types";

interface UseWorkflowActionsParams {
  companyCode: string;
  txType: string;
  transactionId: string;
  status: string;
  statusLabel: string;
  previousStatus: { value: string; label: string } | null;
  onActionComplete?: () => void;
}

export function useWorkflowActions({
  companyCode,
  txType,
  transactionId,
  statusLabel,
  previousStatus,
  onActionComplete,
}: UseWorkflowActionsParams) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ActionConfig | null>(null);
  const [notes, setNotes] = useState("");
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("");

  const executeAction = async (action: string, actionNotes?: string) => {
    setLoading(true);
    const toastId = toast.loading("กำลังดำเนินการ...");

    try {
      if (action === "cancel_tax_invoice_request") {
        const res = await fetch(`/api/${companyCode}/tax-invoice-follow-ups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expenseIds: [transactionId],
            action: "cancel_requested",
            notes: actionNotes || notes || undefined,
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "เกิดข้อผิดพลาด");
        }
        toast.success("ยกเลิกการขอใบกำกับสำเร็จ", { id: toastId });
        setConfirmDialog(null);
        setNotes("");
        onActionComplete?.();
        return;
      }

      if (action === "mark_tax_invoice_requested") {
        const res = await fetch(`/api/${companyCode}/tax-invoice-follow-ups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expenseIds: [transactionId],
            action: "mark_requested",
            notes: actionNotes || notes || undefined,
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "เกิดข้อผิดพลาด");
        }
        toast.success("บันทึกการขอใบกำกับสำเร็จ", { id: toastId });
        setConfirmDialog(null);
        setNotes("");
        onActionComplete?.();
        return;
      }

      const metadata = action === "send_wht" && deliveryMethod ? { deliveryMethod } : undefined;
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: txType,
          transactionId,
          action,
          notes: actionNotes || notes,
          metadata,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "เกิดข้อผิดพลาด");
      }
      toast.success("อัปเดตสถานะสำเร็จ", { id: toastId });
      setConfirmDialog(null);
      setNotes("");
      onActionComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async () => {
    if (!previousStatus) return;
    setLoading(true);
    const toastId = toast.loading("กำลังย้อนสถานะ...");
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: txType,
          transactionId,
          action: "revert",
          targetStatus: previousStatus.value,
          notes: notes || `ย้อนสถานะจาก "${statusLabel}" ไปเป็น "${previousStatus.label}"`,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "เกิดข้อผิดพลาด");
      }
      toast.success(`ย้อนสถานะเป็น "${previousStatus.label}" สำเร็จ`, { id: toastId });
      setShowRevertConfirm(false);
      setNotes("");
      onActionComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: ActionConfig) => {
    if (action.requiresConfirm) {
      setConfirmDialog(action);
      return;
    }
    await executeAction(action.action);
  };

  const resetConfirm = () => {
    setConfirmDialog(null);
    setNotes("");
    setDeliveryMethod("");
  };

  return {
    loading,
    confirmDialog,
    notes,
    setNotes,
    showRevertConfirm,
    setShowRevertConfirm,
    deliveryMethod,
    setDeliveryMethod,
    executeAction,
    handleRevert,
    handleAction,
    resetConfirm,
  };
}
