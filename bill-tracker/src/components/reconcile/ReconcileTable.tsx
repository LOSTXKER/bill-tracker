"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Zap,
  MinusCircle,
  AlertCircle,
  Link2,
  Unlink2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountingRow } from "./ImportPanel";

export interface SystemItem {
  id: string;
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  description: string;
  status: string;
}

export type MatchStatus =
  | "exact"       // Invoice number matched exactly
  | "strong"      // Tax ID + amount matched
  | "fuzzy"       // Amount + date within 3 days
  | "ai"          // AI suggested
  | "system-only" // Only in system, no accounting match
  | "accounting-only"; // Only in accounting report, no system match

export interface MatchedPair {
  id: string;
  systemItem?: SystemItem;
  accountingItem?: AccountingRow;
  accountingIndex?: number;
  status: MatchStatus;
  confidence?: number;
  aiReason?: string;
  userConfirmed?: boolean; // true = confirmed, false = rejected, undefined = pending
}

interface ReconcileTableProps {
  pairs: MatchedPair[];
  onConfirmAI: (id: string) => void;
  onRejectAI: (id: string) => void;
  onManualLink: (systemId: string, accountingIndex: number) => void;
  onUnlink: (id: string) => void;
  selectedSystemId: string | null;
  selectedAccountingIndex: number | null;
  onSelectSystem: (id: string | null) => void;
  onSelectAccounting: (index: number | null) => void;
}

const STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; color: string; icon: React.ReactNode; rowClass: string }
> = {
  exact: {
    label: "ตรงกัน",
    color: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    rowClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
  },
  strong: {
    label: "ตรงกัน (Tax ID)",
    color: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    rowClass: "bg-emerald-50/30 dark:bg-emerald-950/10",
  },
  fuzzy: {
    label: "ใกล้เคียง",
    color: "text-blue-600 dark:text-blue-400",
    icon: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
    rowClass: "bg-blue-50/30 dark:bg-blue-950/10",
  },
  ai: {
    label: "AI แนะนำ",
    color: "text-amber-600 dark:text-amber-400",
    icon: <Zap className="h-4 w-4 text-amber-500" />,
    rowClass: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  "system-only": {
    label: "เฉพาะในระบบ",
    color: "text-slate-500",
    icon: <MinusCircle className="h-4 w-4 text-slate-400" />,
    rowClass: "bg-slate-50/50 dark:bg-slate-900/20",
  },
  "accounting-only": {
    label: "เฉพาะในรายงาน",
    color: "text-red-600 dark:text-red-400",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    rowClass: "bg-red-50/50 dark:bg-red-950/20",
  },
};

function formatAmt(n?: number) {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return iso;
  }
}

export function ReconcileTable({
  pairs,
  onConfirmAI,
  onRejectAI,
  onManualLink,
  onUnlink,
  selectedSystemId,
  selectedAccountingIndex,
  onSelectSystem,
  onSelectAccounting,
}: ReconcileTableProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_1fr] border-b bg-muted/50">
          <div className="px-3 py-2 grid grid-cols-[80px_1fr_72px_60px] gap-1">
            <span className="text-xs font-semibold text-muted-foreground">วันที่</span>
            <span className="text-xs font-semibold text-muted-foreground">ผู้ขาย / ผู้ติดต่อ</span>
            <span className="text-xs font-semibold text-muted-foreground text-right">ยอด</span>
            <span className="text-xs font-semibold text-muted-foreground text-right">VAT</span>
          </div>
          <div className="flex items-center justify-center px-2 py-2">
            <span className="text-xs font-semibold text-muted-foreground">สถานะ</span>
          </div>
          <div className="px-3 py-2 grid grid-cols-[80px_1fr_72px_60px] gap-1">
            <span className="text-xs font-semibold text-muted-foreground">วันที่</span>
            <span className="text-xs font-semibold text-muted-foreground">ชื่อผู้ขาย (รายงาน)</span>
            <span className="text-xs font-semibold text-muted-foreground text-right">ยอด</span>
            <span className="text-xs font-semibold text-muted-foreground text-right">VAT</span>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {pairs.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-sm">
              ยังไม่มีข้อมูลรายงานบัญชี — อัปโหลดไฟล์เพื่อเริ่มเปรียบเทียบ
            </div>
          )}

          {pairs.map((pair) => {
            const cfg = STATUS_CONFIG[pair.status];
            const isSelected =
              (pair.systemItem && pair.systemItem.id === selectedSystemId) ||
              (pair.accountingIndex !== undefined && pair.accountingIndex === selectedAccountingIndex);

            const amtDiff =
              pair.systemItem && pair.accountingItem
                ? Math.abs(pair.systemItem.baseAmount - pair.accountingItem.baseAmount)
                : 0;
            const hasDiff = amtDiff > 0.01;

            return (
              <div
                key={pair.id}
                className={cn(
                  "grid grid-cols-[1fr_80px_1fr] transition-colors",
                  cfg.rowClass,
                  isSelected && "ring-1 ring-inset ring-primary/40"
                )}
              >
                {/* Left: System */}
                <div
                  className={cn(
                    "px-3 py-2.5 grid grid-cols-[80px_1fr_72px_60px] gap-1 items-center cursor-pointer",
                    !pair.systemItem && "opacity-30",
                    pair.status === "system-only" || pair.status === "accounting-only"
                      ? "hover:bg-muted/30"
                      : ""
                  )}
                  onClick={() => {
                    if (pair.systemItem) {
                      onSelectSystem(
                        selectedSystemId === pair.systemItem.id ? null : pair.systemItem.id
                      );
                    }
                  }}
                >
                  <span className="text-xs text-muted-foreground truncate">
                    {formatDate(pair.systemItem?.date)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {pair.systemItem?.vendorName || "—"}
                    </p>
                    {pair.systemItem?.invoiceNumber && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {pair.systemItem.invoiceNumber}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-right font-mono">
                    {formatAmt(pair.systemItem?.baseAmount)}
                  </span>
                  <span className="text-xs text-right font-mono text-blue-600 dark:text-blue-400">
                    {formatAmt(pair.systemItem?.vatAmount)}
                  </span>
                </div>

                {/* Center: Status */}
                <div className="flex flex-col items-center justify-center gap-1 px-1 py-1 border-x border-muted">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-0.5 cursor-default">
                        {cfg.icon}
                        <span className={cn("text-[9px] font-medium leading-tight text-center", cfg.color)}>
                          {cfg.label}
                        </span>
                        {pair.confidence !== undefined && (
                          <span className="text-[9px] text-muted-foreground">
                            {Math.round(pair.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    {pair.aiReason && (
                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                        {pair.aiReason}
                      </TooltipContent>
                    )}
                  </Tooltip>

                  {/* Actions */}
                  {pair.status === "ai" && pair.userConfirmed === undefined && (
                    <div className="flex gap-0.5 mt-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => onConfirmAI(pair.id)}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">ยืนยัน</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onRejectAI(pair.id)}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">ปฏิเสธ</TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  {/* Manual link button when both selected but different rows */}
                  {pair.status === "system-only" &&
                    pair.systemItem?.id === selectedSystemId &&
                    selectedAccountingIndex !== null && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-primary hover:bg-primary/10"
                            onClick={() =>
                              onManualLink(pair.systemItem!.id, selectedAccountingIndex!)
                            }
                          >
                            <Link2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">เชื่อมด้วยตนเอง</TooltipContent>
                      </Tooltip>
                    )}

                  {/* Unlink for confirmed pairs */}
                  {(pair.status === "exact" ||
                    pair.status === "strong" ||
                    pair.status === "fuzzy" ||
                    (pair.status === "ai" && pair.userConfirmed)) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onUnlink(pair.id)}
                        >
                          <Unlink2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">ยกเลิกการจับคู่</TooltipContent>
                    </Tooltip>
                  )}

                  {hasDiff && pair.systemItem && pair.accountingItem && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[9px] px-1 h-4 text-amber-600 border-amber-300">
                          ต่าง {formatAmt(amtDiff)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">ยอดเงินต่างกัน</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Right: Accounting */}
                <div
                  className={cn(
                    "px-3 py-2.5 grid grid-cols-[80px_1fr_72px_60px] gap-1 items-center cursor-pointer",
                    !pair.accountingItem && "opacity-30",
                    (pair.status === "accounting-only" || pair.status === "system-only")
                      ? "hover:bg-muted/30"
                      : ""
                  )}
                  onClick={() => {
                    if (pair.accountingIndex !== undefined) {
                      onSelectAccounting(
                        selectedAccountingIndex === pair.accountingIndex
                          ? null
                          : pair.accountingIndex
                      );
                    }
                  }}
                >
                  <span className="text-xs text-muted-foreground truncate">
                    {formatDate(pair.accountingItem?.date)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {pair.accountingItem?.vendorName || "—"}
                    </p>
                    {pair.accountingItem?.invoiceNumber && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {pair.accountingItem.invoiceNumber}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-right font-mono">
                    {formatAmt(pair.accountingItem?.baseAmount)}
                  </span>
                  <span className="text-xs text-right font-mono text-blue-600 dark:text-blue-400">
                    {formatAmt(pair.accountingItem?.vatAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
