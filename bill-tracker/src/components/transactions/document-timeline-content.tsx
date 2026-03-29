"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";
import {
  createEventConfig,
  getDefaultEventEntry,
  getStatusLabel,
  useDocumentEvents,
} from "./timeline-shared";

interface DocumentTimelineContentProps {
  companyCode: string;
  expenseId?: string;
  incomeId?: string;
}

const ICON_CLASS = "h-3.5 w-3.5";

export function DocumentTimelineContent({ companyCode, expenseId, incomeId }: DocumentTimelineContentProps) {
  const { events, loading } = useDocumentEvents({ companyCode, expenseId, incomeId });
  const EVENT_CONFIG = useMemo(() => createEventConfig(ICON_CLASS), []);

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
            ...getDefaultEventEntry(ICON_CLASS),
            label: event.eventType,
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
                      {getStatusLabel(event.toStatus, !!expenseId)}
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
