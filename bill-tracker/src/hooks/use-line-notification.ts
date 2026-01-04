"use client";

import { useState } from "react";
import { toast } from "sonner";

type TransactionType = "expense" | "income";

interface UseLineNotificationReturn {
  sending: boolean;
  sendNotification: (id: string) => Promise<void>;
}

/**
 * Custom hook to send LINE notifications for transactions
 * @param type - The transaction type (expense or income)
 * @returns Object containing sending state and sendNotification function
 */
export function useLineNotification(type: TransactionType): UseLineNotificationReturn {
  const [sending, setSending] = useState(false);

  const sendNotification = async (id: string) => {
    setSending(true);
    try {
      const endpoint = type === "expense" 
        ? `/api/expenses/${id}/notify`
        : `/api/incomes/${id}/notify`;
      
      const response = await fetch(endpoint, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("📤 ส่งการแจ้งเตือนไปยัง LINE สำเร็จ");
      } else {
        toast.error(data.error || "ไม่สามารถส่งการแจ้งเตือนได้");
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error("เกิดข้อผิดพลาดในการส่งการแจ้งเตือน");
    } finally {
      setSending(false);
    }
  };

  return {
    sending,
    sendNotification,
  };
}
