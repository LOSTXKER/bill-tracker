"use client";

/**
 * Audit History Content Component (without Card wrapper)
 * Used inside CombinedHistorySection
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Loader2, User, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  FIELD_LABELS,
  STATUS_LABELS,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
  ACTION_COLORS,
  getFieldLabel,
  getStatusLabel,
  getEntityTypeLabel,
} from "@/lib/constants/audit-labels";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  changes: any;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface AuditHistoryContentProps {
  companyId: string;
  entityType: "Expense" | "Income" | string;
  entityId: string;
  refreshKey?: number;
}

function formatDescription(log: AuditLog): string {
  const typeLabel = getEntityTypeLabel(log.entityType);
  
  if (log.action === "STATUS_CHANGE" && log.changes) {
    const oldLabel = log.changes.oldStatusLabel || getStatusLabel(log.changes.oldStatus);
    const newLabel = log.changes.newStatusLabel || getStatusLabel(log.changes.newStatus);
    return `เปลี่ยนสถานะ: ${oldLabel} → ${newLabel}`;
  }
  
  if (log.action === "CREATE") {
    return `สร้างรายการใหม่`;
  }
  
  if (log.action === "DELETE") {
    return `ลบรายการ`;
  }
  
  if (log.action === "UPDATE" && log.changes?.changedFields) {
    const fields = log.changes.changedFields.map(getFieldLabel);
    const userFacingFields = ([...new Set(fields)] as string[]).filter((f) => 
      !["updatedAt", "company", "creator", "วันที่อัปเดต", "บริษัท", "ผู้สร้าง"].includes(f)
    );
    if (userFacingFields.length > 0) {
      return `แก้ไข: ${userFacingFields.join(", ")}`;
    }
    return `แก้ไขรายการ`;
  }
  
  if (log.description) {
    let desc = log.description;
    Object.entries(ENTITY_TYPE_LABELS).forEach(([en, th]) => {
      desc = desc.replace(new RegExp(en, "g"), th);
    });
    Object.entries(STATUS_LABELS).forEach(([code, label]) => {
      desc = desc.replace(new RegExp(code, "g"), label);
    });
    Object.entries(FIELD_LABELS).forEach(([en, th]) => {
      desc = desc.replace(new RegExp(`\\b${en}\\b`, "g"), th);
    });
    desc = desc.replace(/\s*[a-z]{3}[a-z0-9]{5,}\.{0,3}:?\s*/gi, " ");
    desc = desc.replace(/: ID: [a-z0-9]+\.\.\.?/gi, "");
    desc = desc.replace(/ID: [a-z0-9]+\.\.\.?/gi, "");
    desc = desc.replace(/:\s*:/g, ":");
    desc = desc.replace(/\s+/g, " ").trim();
    desc = desc.replace(/:$/, "").trim();
    return desc;
  }
  
  return `${ACTION_LABELS[log.action] || log.action}${typeLabel}`;
}

export function AuditHistoryContent({ 
  companyId, 
  entityType, 
  entityId,
  refreshKey = 0 
}: AuditHistoryContentProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [companyId, entityType, entityId, refreshKey]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        entityType,
        limit: "100",
      });

      const response = await fetch(
        `/api/companies/${companyId}/audit-logs?${params}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError("ไม่มีสิทธิ์ดูประวัติ");
          return;
        }
        throw new Error("Failed to load audit history");
      }

      const result = await response.json();
      
      const filteredLogs = result.data.logs.filter(
        (log: AuditLog) => log.entityId === entityId
      );
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error("Error loading audit history:", error);
      setError("ไม่สามารถโหลดประวัติได้");
    } finally {
      setLoading(false);
    }
  };

  const displayLogs = showAll ? logs : logs.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400 text-center py-4">
        {error}
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <History className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">ยังไม่มีประวัติแก้ไข</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayLogs.map((log, index) => (
        <div
          key={log.id}
          className={cn(
            "relative pl-6 pb-3",
            index !== displayLogs.length - 1 && "border-l-2 border-muted ml-2"
          )}
        >
          {/* Timeline dot */}
          <div className={cn(
            "absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-1/2 flex items-center justify-center",
            index === 0 ? "bg-primary" : "bg-muted"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              index === 0 ? "bg-white" : "bg-muted-foreground"
            )} />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                )}
              >
                {ACTION_LABELS[log.action] || log.action}
              </Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(log.createdAt), {
                  addSuffix: true,
                  locale: th,
                })}
              </span>
            </div>
            
            <p className="text-sm text-foreground">
              {formatDescription(log)}
            </p>
            
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              <span>{log.user.name}</span>
              <span>•</span>
              <span>
                {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: th })}
              </span>
            </div>
          </div>
        </div>
      ))}
      
      {logs.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "แสดงน้อยลง" : `ดูทั้งหมด (${logs.length})`}
        </Button>
      )}
    </div>
  );
}
