"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UseTransactionActionsOptions {
  transactionType: "expense" | "income";
  transactionId: string;
  companyCode: string;
  statusFlow: readonly string[];
  statusInfo: Record<string, { label: string }>;
  onSuccess?: () => void;
}

export function useTransactionActions({
  transactionType,
  transactionId,
  companyCode,
  statusFlow,
  statusInfo,
  onSuccess,
}: UseTransactionActionsOptions) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/${transactionType}s/${transactionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "ลบรายการล้มเหลว");
      }

      toast.success("ลบรายการสำเร็จ");
      router.refresh();
      router.push(`/${companyCode}/${transactionType}s`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (
    newStatus: string,
    transactionData: any
  ) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/${transactionType}s/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(
        `เปลี่ยนสถานะเป็น "${statusInfo[newStatus]?.label || newStatus}" สำเร็จ`
      );
      
      // Trigger real-time update
      router.refresh();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1)
      return null;
    return statusFlow[currentIndex + 1];
  };

  const getPreviousStatus = (currentStatus: string): string | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex <= 0) return null;
    return statusFlow[currentIndex - 1];
  };

  const handleNextStatus = (currentStatus: string, transactionData: any) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      handleStatusChange(nextStatus, transactionData);
    }
  };

  const handlePreviousStatus = (
    currentStatus: string,
    transactionData: any
  ) => {
    const prevStatus = getPreviousStatus(currentStatus);
    if (prevStatus) {
      handleStatusChange(prevStatus, transactionData);
    }
  };

  return {
    deleting,
    saving,
    handleDelete,
    handleStatusChange,
    handleNextStatus,
    handlePreviousStatus,
    getNextStatus,
    getPreviousStatus,
  };
}
