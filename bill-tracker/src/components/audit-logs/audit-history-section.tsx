"use client";

/**
 * Audit History Section Component
 * 
 * Shows audit history for a specific entity (expense/income)
 * Used in transaction detail pages
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface AuditHistorySectionProps {
  companyId: string;
  entityType: "Expense" | "Income";
  entityId: string;
  refreshKey?: number; // Change this to trigger a refresh
}

// All constants and helper functions are now imported from @/lib/constants/audit-labels

/**
 * Format a user-friendly description for an audit log
 */
function formatDescription(log: AuditLog): string {
  const typeLabel = getEntityTypeLabel(log.entityType);
  
  if (log.action === "STATUS_CHANGE" && log.changes) {
    const oldLabel = log.changes.oldStatusLabel || getStatusLabel(log.changes.oldStatus);
    const newLabel = log.changes.newStatusLabel || getStatusLabel(log.changes.newStatus);
    return `เปลี่ยนสถานะ${typeLabel}: ${oldLabel} → ${newLabel}`;
  }
  
  if (log.action === "CREATE") {
    return `สร้าง${typeLabel}ใหม่`;
  }
  
  if (log.action === "DELETE") {
    return `ลบ${typeLabel}`;
  }
  
  if (log.action === "UPDATE" && log.changes?.changedFields) {
    // Always translate field names using getFieldLabel
    const fields = log.changes.changedFields.map(getFieldLabel);
    // Filter out technical fields that users don't care about and remove duplicates
    const userFacingFields = ([...new Set(fields)] as string[]).filter((f) => 
      !["updatedAt", "company", "creator", "วันที่อัปเดต", "บริษัท", "ผู้สร้าง"].includes(f)
    );
    if (userFacingFields.length > 0) {
      return `แก้ไข${typeLabel}: ${userFacingFields.join(", ")}`;
    }
    return `แก้ไข${typeLabel}`;
  }
  
  // Fallback: use original description but try to translate any status codes
  if (log.description) {
    let desc = log.description;
    // Replace entity type names
    Object.entries(ENTITY_TYPE_LABELS).forEach(([en, th]) => {
      desc = desc.replace(new RegExp(en, "g"), th);
    });
    // Replace status codes
    Object.entries(STATUS_LABELS).forEach(([code, label]) => {
      desc = desc.replace(new RegExp(code, "g"), label);
    });
    // Replace field names (e.g., "vatAmount, isWht" -> "ยอด VAT, หักภาษี ณ ที่จ่าย")
    Object.entries(FIELD_LABELS).forEach(([en, th]) => {
      // Match whole word to avoid partial replacements
      desc = desc.replace(new RegExp(`\\b${en}\\b`, "g"), th);
    });
    // Remove ID references like "cmk2aylx...:" or "ID: cmk2aylx..."
    desc = desc.replace(/\s*[a-z]{3}[a-z0-9]{5,}\.{0,3}:?\s*/gi, " ");
    desc = desc.replace(/: ID: [a-z0-9]+\.\.\.?/gi, "");
    desc = desc.replace(/ID: [a-z0-9]+\.\.\.?/gi, "");
    // Clean up extra colons and spaces
    desc = desc.replace(/:\s*:/g, ":");
    desc = desc.replace(/\s+/g, " ").trim();
    // Remove trailing colon
    desc = desc.replace(/:$/, "").trim();
    return desc;
  }
  
  return `${ACTION_LABELS[log.action] || log.action}${typeLabel}`;
}

export function AuditHistorySection({ 
  companyId, 
  entityType, 
  entityId,
  refreshKey = 0 
}: AuditHistorySectionProps) {
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
      
      // Fetch audit logs filtered by entityType
      const params = new URLSearchParams({
        entityType,
        limit: "100",
      });

      const response = await fetch(
        `/api/companies/${companyId}/audit-logs?${params}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError("ไม่มีสิทธิ์ดูประวัติการแก้ไข");
          return;
        }
        throw new Error("Failed to load audit history");
      }

      const result = await response.json();
      
      // Filter logs that match this specific entity
      const filteredLogs = result.data.logs.filter(
        (log: AuditLog) => log.entityId === entityId
      );
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error("Error loading audit history:", error);
      setError("ไม่สามารถโหลดประวัติการแก้ไขได้");
    } finally {
      setLoading(false);
    }
  };

  const displayLogs = showAll ? logs : logs.slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            ประวัติการแก้ไข
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          ประวัติการแก้ไข
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {logs.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {error ? (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center py-4">
            {error}
          </p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            ไม่มีประวัติการแก้ไข
          </p>
        ) : (
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
                        "text-xs",
                        ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                      )}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground">
                    {formatDescription(log)}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{log.user.name}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: th })}
                    </span>
                  </div>
                  
                  {/* Show changed fields for updates - hidden since it's already in the description */}
                  
                  {/* Show status change details */}
                  {log.action === "STATUS_CHANGE" && log.changes && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <span className="text-muted-foreground">
                        {log.changes.oldStatusLabel || getStatusLabel(log.changes.oldStatus)} → {log.changes.newStatusLabel || getStatusLabel(log.changes.newStatus)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Show more button */}
            {logs.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "แสดงน้อยลง" : `แสดงทั้งหมด (${logs.length})`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
