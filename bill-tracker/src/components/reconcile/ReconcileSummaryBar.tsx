"use client";

import { CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmt } from "./reconcile-types";
import { RANGE_PRESETS } from "./ReconcileTable";
import type { MatchedPair, SystemItem, MonthRange } from "./ReconcileTable";
import type { AccountingRow } from "./ImportPanel";

interface ReconcileSummaryBarProps {
  pairs: MatchedPair[];
  systemItems: SystemItem[];
  accountingItems: AccountingRow[];
  spilloverInfo: {
    hasSpillover: boolean;
    presetCounts: Map<MonthRange, number>;
  };
  monthRange: MonthRange;
  onMonthRangeChange: (range: MonthRange) => void;
}

export function ReconcileSummaryBar({
  pairs,
  systemItems,
  accountingItems,
  spilloverInfo,
  monthRange,
  onMonthRangeChange,
}: ReconcileSummaryBarProps) {
  const systemTotal = systemItems.reduce((s, i) => s + i.baseAmount, 0);
  const accountingTotal = accountingItems.reduce((s, i) => s + i.baseAmount, 0);

  const matched = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed)
  ).length;
  const aiPending = pairs.filter(
    (p) => p.status === "ai" && p.userConfirmed === undefined
  ).length;

  const totalDiff = Math.abs(systemTotal - accountingTotal);
  const isBalanced = totalDiff < 0.01;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">ระบบ:</span>
        <span className="font-semibold text-sm">{formatAmt(systemTotal)}</span>
        <span className="text-muted-foreground">({systemItems.length})</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {accountingItems.length > 0 ? (
        <>
          <div className="flex items-center gap-1.5">
            {isBalanced ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            )}
            <span
              className={cn(
                "font-medium",
                isBalanced ? "text-emerald-600" : "text-amber-600"
              )}
            >
              ต่าง {formatAmt(totalDiff)}
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">รายงาน:</span>
            <span className="font-semibold text-sm">
              {formatAmt(accountingTotal)}
            </span>
            <span className="text-muted-foreground">
              ({accountingItems.length})
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {matched}
            {aiPending > 0 && (
              <>
                <Zap className="h-3 w-3 text-amber-500 ml-1" /> {aiPending}
              </>
            )}
          </div>
        </>
      ) : (
        <span className="text-muted-foreground">ยังไม่มีข้อมูลรายงาน</span>
      )}

      {spilloverInfo.hasSpillover && (
        <>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {RANGE_PRESETS.map((preset) => {
              const count = spilloverInfo.presetCounts.get(preset.value) ?? 0;
              if (preset.value > 0 && count === 0) return null;
              const isActive = monthRange === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onMonthRangeChange(preset.value)}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                    isActive
                      ? "bg-sky-100 dark:bg-sky-900/40 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300 font-medium"
                      : "border-transparent text-muted-foreground hover:border-sky-300 hover:text-sky-600 dark:hover:text-sky-400"
                  )}
                >
                  {preset.label}
                  {preset.value > 0 && (
                    <span className="ml-0.5 opacity-60">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
