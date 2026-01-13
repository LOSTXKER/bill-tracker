"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Receipt, 
  Send,
  CheckCircle,
  Clock,
  Upload,
  Edit,
  Plus,
  AlertCircle,
  Bell
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";

interface DocumentTimelineContentProps {
  companyCode: string;
  expenseId?: string;
  incomeId?: string;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  eventDate: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  metadata: any;
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

const EVENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CREATED: { label: "สร้างรายการ", icon: <Plus className="h-3.5 w-3.5" />, color: "bg-green-500" },
  UPDATED: { label: "แก้ไขรายการ", icon: <Edit className="h-3.5 w-3.5" />, color: "bg-blue-500" },
  STATUS_CHANGED: { label: "เปลี่ยนสถานะ", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-purple-500" },
  FILE_UPLOADED: { label: "อัปโหลดไฟล์", icon: <Upload className="h-3.5 w-3.5" />, color: "bg-cyan-500" },
  FILE_REMOVED: { label: "ลบไฟล์", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "bg-red-500" },
  NOTE_ADDED: { label: "เพิ่มหมายเหตุ", icon: <FileText className="h-3.5 w-3.5" />, color: "bg-gray-500" },
  TAX_INVOICE_REQUESTED: { label: "ขอใบกำกับจากร้าน", icon: <Receipt className="h-3.5 w-3.5" />, color: "bg-orange-500" },
  TAX_INVOICE_RECEIVED: { label: "ได้รับใบกำกับ", icon: <Receipt className="h-3.5 w-3.5" />, color: "bg-green-500" },
  INVOICE_ISSUED: { label: "ออกใบกำกับให้ลูกค้า", icon: <FileText className="h-3.5 w-3.5" />, color: "bg-blue-500" },
  INVOICE_SENT: { label: "ส่งใบกำกับให้ลูกค้า", icon: <Send className="h-3.5 w-3.5" />, color: "bg-cyan-500" },
  WHT_CERT_ISSUED: { label: "ออกใบ 50 ทวิ", icon: <FileText className="h-3.5 w-3.5" />, color: "bg-amber-500" },
  WHT_CERT_SENT: { label: "ส่งใบ 50 ทวิให้ vendor", icon: <Send className="h-3.5 w-3.5" />, color: "bg-green-500" },
  WHT_CERT_RECEIVED: { label: "ได้รับใบ 50 ทวิ", icon: <Receipt className="h-3.5 w-3.5" />, color: "bg-green-500" },
  WHT_REMINDER_SENT: { label: "ส่งแจ้งเตือนทวงใบ 50 ทวิ", icon: <Bell className="h-3.5 w-3.5" />, color: "bg-yellow-500" },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชี", icon: <Send className="h-3.5 w-3.5" />, color: "bg-blue-500" },
  ACCOUNTANT_CONFIRMED: { label: "บัญชียืนยันรับ", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-green-500" },
};

export function DocumentTimelineContent({ companyCode, expenseId, incomeId }: DocumentTimelineContentProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (expenseId) params.set("expenseId", expenseId);
        if (incomeId) params.set("incomeId", incomeId);

        const res = await fetch(`/api/${companyCode}/document-events?${params}`);
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">ยังไม่มีประวัติเอกสาร</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {events.map((event) => {
          const config = EVENT_CONFIG[event.eventType] || {
            label: event.eventType,
            icon: <FileText className="h-3.5 w-3.5" />,
            color: "bg-gray-500",
          };

          return (
            <div key={event.id} className="relative flex gap-3 pl-1">
              {/* Timeline dot */}
              <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full ${config.color} text-white shrink-0`}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{config.label}</span>
                  {event.toStatus && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {event.toStatus}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <span>{event.creator.name}</span>
                  <span className="mx-1.5">•</span>
                  <span title={format(new Date(event.eventDate), "dd MMM yyyy HH:mm", { locale: th })}>
                    {formatDistanceToNow(new Date(event.eventDate), { addSuffix: true, locale: th })}
                  </span>
                </div>
                {event.notes && (
                  <p className="text-xs mt-1.5 p-2 bg-muted rounded text-muted-foreground">
                    {event.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
