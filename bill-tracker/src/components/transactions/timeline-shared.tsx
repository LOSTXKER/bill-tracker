"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Receipt,
  Send,
  CheckCircle,
  Upload,
  Edit,
  Plus,
  AlertCircle,
  Bell,
} from "lucide-react";
import {
  EXPENSE_WORKFLOW_INFO,
  INCOME_WORKFLOW_INFO,
} from "@/lib/constants/transaction";

export interface TimelineEvent {
  id: string;
  eventType: string;
  eventDate: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  metadata?: Record<string, unknown>;
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

export const getStatusLabel = (status: string, isExpense: boolean) => {
  const info = isExpense
    ? EXPENSE_WORKFLOW_INFO[status as keyof typeof EXPENSE_WORKFLOW_INFO]
    : INCOME_WORKFLOW_INFO[status as keyof typeof INCOME_WORKFLOW_INFO];
  return info?.label || status;
};

export type EventConfigMap = Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
>;

const ICON_MAP = {
  CREATED: Plus,
  UPDATED: Edit,
  STATUS_CHANGED: CheckCircle,
  FILE_UPLOADED: Upload,
  FILE_REMOVED: AlertCircle,
  NOTE_ADDED: FileText,
  TAX_INVOICE_REQUESTED: Receipt,
  TAX_INVOICE_RECEIVED: Receipt,
  INVOICE_ISSUED: FileText,
  INVOICE_SENT: Send,
  WHT_CERT_ISSUED: FileText,
  WHT_CERT_SENT: Send,
  WHT_CERT_RECEIVED: Receipt,
  WHT_REMINDER_SENT: Bell,
  SENT_TO_ACCOUNTANT: Send,
  ACCOUNTANT_CONFIRMED: CheckCircle,
} as const;

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  CREATED: { label: "สร้างรายการ", color: "bg-green-500" },
  UPDATED: { label: "แก้ไขรายการ", color: "bg-blue-500" },
  STATUS_CHANGED: { label: "เปลี่ยนสถานะ", color: "bg-purple-500" },
  FILE_UPLOADED: { label: "อัปโหลดไฟล์", color: "bg-cyan-500" },
  FILE_REMOVED: { label: "ลบไฟล์", color: "bg-red-500" },
  NOTE_ADDED: { label: "เพิ่มหมายเหตุ", color: "bg-gray-500" },
  TAX_INVOICE_REQUESTED: { label: "ขอใบกำกับจากร้าน", color: "bg-orange-500" },
  TAX_INVOICE_RECEIVED: { label: "ได้รับใบกำกับ", color: "bg-green-500" },
  INVOICE_ISSUED: { label: "ออกใบกำกับให้ลูกค้า", color: "bg-blue-500" },
  INVOICE_SENT: { label: "ส่งใบกำกับให้ลูกค้า", color: "bg-cyan-500" },
  WHT_CERT_ISSUED: { label: "ออกใบ 50 ทวิ", color: "bg-amber-500" },
  WHT_CERT_SENT: { label: "ส่งใบ 50 ทวิให้ vendor", color: "bg-green-500" },
  WHT_CERT_RECEIVED: { label: "ได้รับใบ 50 ทวิ", color: "bg-green-500" },
  WHT_REMINDER_SENT: { label: "ส่งแจ้งเตือนทวงใบ 50 ทวิ", color: "bg-yellow-500" },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชี", color: "bg-blue-500" },
  ACCOUNTANT_CONFIRMED: { label: "บัญชียืนยันรับ", color: "bg-green-500" },
};

export function createEventConfig(iconClass: string): EventConfigMap {
  const config: EventConfigMap = {};
  for (const [key, { label, color }] of Object.entries(EVENT_LABELS)) {
    const Icon = ICON_MAP[key as keyof typeof ICON_MAP];
    config[key] = { label, icon: <Icon className={iconClass} />, color };
  }
  return config;
}

export function getDefaultEventEntry(iconClass: string) {
  return {
    label: "",
    icon: <FileText className={iconClass} />,
    color: "bg-gray-500",
  };
}

export function useDocumentEvents({
  companyCode,
  expenseId,
  incomeId,
}: {
  companyCode: string;
  expenseId?: string;
  incomeId?: string;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (expenseId) params.set("expenseId", expenseId);
        if (incomeId) params.set("incomeId", incomeId);

        const res = await fetch(
          `/api/${companyCode}/document-events?${params}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvents(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching timeline events:", error);
      } finally {
        setLoading(false);
      }
    };

    if (expenseId || incomeId) {
      fetchEvents();
    }
  }, [companyCode, expenseId, incomeId]);

  return { events, loading };
}
