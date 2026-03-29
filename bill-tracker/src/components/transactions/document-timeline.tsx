"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DocumentTimelineProps {
  companyCode: string;
  expenseId?: string;
  incomeId?: string;
}

const ICON_CLASS = "h-4 w-4";

export function DocumentTimeline({ companyCode, expenseId, incomeId }: DocumentTimelineProps) {
  const { events, loading } = useDocumentEvents({ companyCode, expenseId, incomeId });
  const EVENT_CONFIG = useMemo(() => createEventConfig(ICON_CLASS), []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            ประวัติเอกสาร
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          ประวัติเอกสาร
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>ยังไม่มีประวัติ</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {events.map((event, index) => {
                const config = EVENT_CONFIG[event.eventType] || {
                  ...getDefaultEventEntry(ICON_CLASS),
                  label: event.eventType,
                };

                return (
                  <div key={event.id} className="relative flex gap-4 pl-2">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.color} text-white`}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{config.label}</span>
                        {event.toStatus && (
                          <Badge variant="secondary" className="text-xs">
                            {getStatusLabel(event.toStatus, !!expenseId)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>{event.creator.name}</span>
                        <span className="mx-2">•</span>
                        <span title={format(new Date(event.eventDate), "dd MMM yyyy HH:mm", { locale: th })}>
                          {formatDistanceToNow(new Date(event.eventDate), { addSuffix: true, locale: th })}
                        </span>
                      </div>
                      {event.notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
