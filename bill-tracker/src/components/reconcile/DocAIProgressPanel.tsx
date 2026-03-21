"use client";

import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Loader2,
  FileSearch,
  ScanEye,
  Sparkles,
  XCircle,
  X,
  FileText,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ItemStatus = "pending" | "searching" | "found" | "reading" | "done" | "skipped" | "error";

export interface DocAIItemProgress {
  itemId: string;
  vendorName: string;
  status: ItemStatus;
  docCount?: number;
  docsRead?: number;
  docTotal?: number;
  lastSnippet?: string;
  matchedWith?: string;
  matchReason?: string;
}

export type DocAIPhase = "analyzing" | "matching" | "done" | "error";

export interface DocAISummary {
  totalAnalyzed: number;
  docsRead: number;
  matchesFound: number;
}

interface DocAIProgressPanelProps {
  phase: DocAIPhase;
  items: DocAIItemProgress[];
  totalItems: number;
  summary?: DocAISummary;
  errorMessage?: string;
  onClose: () => void;
}

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
    case "searching":
      return <FileSearch className="h-3.5 w-3.5 text-blue-500 animate-pulse" />;
    case "found":
      return <Eye className="h-3.5 w-3.5 text-blue-500" />;
    case "reading":
      return <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin" />;
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "skipped":
      return <XCircle className="h-3.5 w-3.5 text-muted-foreground/60" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  }
}

function statusLabel(item: DocAIItemProgress): string {
  if (item.matchedWith) {
    return `จับคู่ได้ → ${item.matchedWith}`;
  }
  switch (item.status) {
    case "pending":
      return "รอคิว";
    case "searching":
      return "ค้นหาเอกสาร...";
    case "found":
      return `พบ ${item.docCount} เอกสาร`;
    case "reading":
      return `อ่านเอกสาร ${item.docsRead ?? 0}/${item.docTotal ?? 0}...`;
    case "done":
      return item.docCount
        ? `อ่านเสร็จ ${item.docCount} เอกสาร`
        : "เสร็จสิ้น";
    case "skipped":
      return "ไม่พบเอกสาร";
    case "error":
      return "เกิดข้อผิดพลาด";
  }
}

export function DocAIProgressPanel({
  phase,
  items,
  totalItems,
  summary,
  errorMessage,
  onClose,
}: DocAIProgressPanelProps) {
  const completedCount = items.filter(
    (i) => i.status === "done" || i.status === "skipped"
  ).length;

  const progressPercent = useMemo(() => {
    if (phase === "done") return 100;
    if (phase === "matching") return 90;
    if (totalItems === 0) return 0;
    return Math.round((completedCount / totalItems) * 85);
  }, [phase, completedCount, totalItems]);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case "analyzing":
        return `วิเคราะห์เอกสาร ${completedCount}/${totalItems}`;
      case "matching":
        return "AI กำลังจับคู่...";
      case "done":
        return summary
          ? `เสร็จสิ้น — จับคู่ได้ ${summary.matchesFound} รายการ`
          : "เสร็จสิ้น";
      case "error":
        return "เกิดข้อผิดพลาด";
    }
  }, [phase, completedCount, totalItems, summary]);

  const phaseIcon = useMemo(() => {
    switch (phase) {
      case "analyzing":
        return <ScanEye className="h-4 w-4 text-violet-500 animate-pulse" />;
      case "matching":
        return <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />;
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  }, [phase]);

  return (
    <Card className="border-violet-200 dark:border-violet-800/50 bg-gradient-to-b from-violet-50/50 to-background dark:from-violet-950/20 dark:to-background overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-100 dark:border-violet-900/30">
          {phaseIcon}
          <span className="text-sm font-semibold flex-1">{phaseLabel}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {progressPercent}%
          </span>
          {phase === "done" || phase === "error" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-2">
          <Progress
            value={progressPercent}
            className={cn(
              "h-1.5",
              phase === "done" ? "[&>[data-slot=progress-indicator]]:bg-emerald-500" : "[&>[data-slot=progress-indicator]]:bg-violet-500"
            )}
          />
        </div>

        {/* Items list */}
        <div className="px-4 py-2 space-y-1 max-h-[200px] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.itemId}
              className={cn(
                "flex items-center gap-2 py-1 rounded px-1 text-sm transition-colors",
                item.status === "reading" || item.status === "searching"
                  ? "bg-violet-50/50 dark:bg-violet-950/20"
                  : ""
              )}
            >
              <StatusIcon status={item.status} />
              <span
                className={cn(
                  "truncate flex-1 min-w-0",
                  item.status === "pending"
                    ? "text-muted-foreground/50"
                    : item.status === "skipped"
                      ? "text-muted-foreground/60"
                      : "text-foreground"
                )}
                title={item.vendorName}
              >
                {item.vendorName}
              </span>
              <span
                className={cn(
                  "text-xs flex-shrink-0",
                  item.matchedWith
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : item.status === "reading" || item.status === "searching"
                      ? "text-violet-600 dark:text-violet-400"
                      : item.status === "done"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                )}
              >
                {statusLabel(item)}
              </span>
            </div>
          ))}
        </div>

        {/* Matching phase indicator */}
        {phase === "matching" && (
          <div className="px-4 py-2 border-t border-violet-100 dark:border-violet-900/30">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>AI กำลังวิเคราะห์และจับคู่...</span>
            </div>
          </div>
        )}

        {/* Summary footer */}
        {phase === "done" && summary && (
          <div className="px-4 py-2.5 border-t border-violet-100 dark:border-violet-900/30 bg-muted/30">
            <div className="flex items-center gap-3 text-xs">
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <FileText className="h-3 w-3" />
                อ่าน {summary.docsRead} เอกสาร
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  summary.matchesFound > 0
                    ? "text-emerald-600 border-emerald-200 dark:border-emerald-800"
                    : "text-muted-foreground"
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                จับคู่ได้ {summary.matchesFound} รายการ
              </Badge>
            </div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && errorMessage && (
          <div className="px-4 py-2.5 border-t border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20">
            <p className="text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
