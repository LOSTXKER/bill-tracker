"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Zap,
  Unlink2,
  Check,
  X,
  Building2,
  Eye,
  Ban,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchedPair, CenterCellProps, SystemRowProps, AccountingRowCellProps } from "./reconcile-table-types";
import { SYS_GRID, ACC_GRID, fmt, fmtDate, SHORT_MONTHS } from "./reconcile-table-types";

export function MatchBadge({ pair }: { pair: MatchedPair }) {
  if (pair.status === "exact" || pair.status === "strong") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        ตรงกัน
      </span>
    );
  }
  if (pair.status === "fuzzy") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
        <CheckCircle2 className="h-3 w-3" />
        ใกล้เคียง
      </span>
    );
  }
  if (pair.status === "ai") {
    if (pair.userConfirmed) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          ยืนยันแล้ว
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <Zap className="h-3 w-3" />
        AI แนะนำ
        {pair.confidence !== undefined && (
          <span className="opacity-60 font-normal">{Math.round(pair.confidence * 100)}%</span>
        )}
      </span>
    );
  }
  return null;
}

function CenterCellInner({ pair, canLink, onConfirmAI, onRejectAI, onUnlink }: CenterCellProps) {
  const isMatched =
    pair.status === "exact" ||
    pair.status === "strong" ||
    pair.status === "fuzzy" ||
    (pair.status === "ai" && pair.userConfirmed);

  const isAIPending = pair.status === "ai" && pair.userConfirmed === undefined;
  const isUnmatched =
    pair.status === "system-only" || pair.status === "accounting-only";

  const amtDiff =
    pair.systemItem && pair.accountingItem
      ? Math.abs(pair.systemItem.baseAmount - pair.accountingItem.baseAmount)
      : 0;

  if (isAIPending) {
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-1.5">
        <MatchBadge pair={pair} />
        {amtDiff > 0.01 && (
          <Badge variant="outline" className="text-[10px] px-1 h-4 text-orange-600 border-orange-300">
            ต่าง {fmt(amtDiff)}
          </Badge>
        )}
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            title="ปฏิเสธ"
            onClick={() => onRejectAI(pair.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="ยืนยัน"
            onClick={() => onConfirmAI(pair.id)}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
        {pair.aiReason && (
          <p className="text-[10px] text-muted-foreground text-center leading-tight max-w-[80px] truncate">
            {pair.aiReason}
          </p>
        )}
      </div>
    );
  }

  if (isMatched) {
    const methodLabel = pair.status === "ai" ? "AI" : pair.status === "exact" || pair.status === "strong" ? "อัตโนมัติ" : "จับคู่";
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-1.5">
        <MatchBadge pair={pair} />
        {amtDiff > 0.01 && (
          <Badge variant="outline" className="text-[10px] px-1 h-4 text-orange-600 border-orange-300">
            ต่าง {fmt(amtDiff)}
          </Badge>
        )}
        {pair.matchedByName && (
          <span className="text-[9px] text-muted-foreground text-center leading-tight truncate max-w-[80px]" title={`${pair.matchedByName} — ${methodLabel}`}>
            {pair.matchedByName}
          </span>
        )}
        <button
          onClick={() => onUnlink(pair.id)}
          className="text-muted-foreground/30 hover:text-destructive transition-colors mt-0.5"
          title="ยกเลิกจับคู่"
        >
          <Unlink2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (isUnmatched) {
    return (
      <div className="flex items-center justify-center px-1 py-1.5">
        {canLink ? (
          <span className="text-[10px] text-primary font-medium text-center leading-tight">
            เลือก<br />อีกฝั่ง
          </span>
        ) : (
          <span className="text-muted-foreground/30 text-lg">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-1 py-1.5">
      <span className="text-muted-foreground/30 text-lg">—</span>
    </div>
  );
}

function SystemRowInner({ item, isSelected, isSelectable, onSelect, showCompanyBadge, onPreview }: SystemRowProps) {
  if (!item) {
    return (
      <div className={cn(SYS_GRID, "items-center px-2 py-1.5 h-8 opacity-25")}>
        <div /><div /><div className="text-[11px] text-muted-foreground italic">—</div><div /><div />
      </div>
    );
  }

  return (
    <div
      className={cn(
        SYS_GRID,
        "items-center px-2 py-1.5 text-[11px] group/sys min-w-0",
        isSelectable && "cursor-pointer select-none hover:bg-muted/30",
        isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30"
      )}
      onClick={isSelectable ? onSelect : undefined}
    >
      <div className="flex justify-center">
        {item.fromMonth ? (
          <span className="text-[9px] px-0.5 rounded bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700 leading-tight whitespace-nowrap">
            {SHORT_MONTHS[item.fromMonth - 1]}
          </span>
        ) : showCompanyBadge && item.companyCode ? (
          <Badge variant="secondary" className="text-[9px] px-0.5 h-4 font-mono">
            {item.companyCode}
          </Badge>
        ) : isSelected ? (
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        ) : null}
      </div>
      <div className="text-muted-foreground truncate">{fmtDate(item.date)}</div>
      <div className="flex items-center gap-1 min-w-0 pr-1">
        <span className="truncate font-medium text-foreground">
          {item.vendorName || item.description || "—"}
        </span>
        {item.isPayOnBehalf && (
          <span className="flex-shrink-0 text-[9px] text-purple-600 dark:text-purple-400 whitespace-nowrap">
            <Building2 className="h-2.5 w-2.5 inline mr-0.5" />
            {item.payOnBehalfFrom && item.payOnBehalfTo
              ? `${item.payOnBehalfFrom}→${item.payOnBehalfTo}`
              : "จ่ายแทน"}
          </span>
        )}
        {onPreview && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="flex-shrink-0 p-0.5 rounded text-muted-foreground/30 hover:text-primary opacity-0 group-hover/sys:opacity-100 transition-opacity"
            title="ดูรายละเอียด"
          >
            <Eye className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="text-right font-mono font-semibold tabular-nums">{fmt(item.baseAmount)}</div>
      <div className="text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">
        {item.vatAmount > 0 ? fmt(item.vatAmount) : ""}
      </div>
    </div>
  );
}

function AccountingRowCellInner({ item, isSelected, isSelectable, onSelect, onSkip, isSkipped }: AccountingRowCellProps) {
  if (!item) {
    return (
      <div className={cn(ACC_GRID, "items-center px-2 py-1.5 h-8 opacity-25")}>
        <div /><div className="text-[11px] text-muted-foreground italic">—</div><div /><div />
      </div>
    );
  }

  return (
    <div
      className={cn(
        ACC_GRID,
        "items-center px-2 py-1.5 text-[11px] min-w-0 group/acc",
        isSelectable && "cursor-pointer select-none hover:bg-muted/30",
        isSelected && "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400/40",
        isSkipped && "opacity-40"
      )}
      onClick={isSelectable && !isSkipped ? onSelect : undefined}
    >
      <div className="text-muted-foreground truncate">{fmtDate(item.date)}</div>
      <div className="flex items-center gap-1 min-w-0 pr-1">
        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
        <span className="truncate font-medium text-foreground">{item.vendorName || "—"}</span>
        {onSkip && !isSkipped && (
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="flex-shrink-0 p-0.5 rounded text-muted-foreground/30 hover:text-orange-500 opacity-0 group-hover/acc:opacity-100 transition-opacity"
            title="ข้ามรายการนี้"
          >
            <Ban className="h-3 w-3" />
          </button>
        )}
        {isSkipped && onSkip && (
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="flex-shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-primary transition-colors"
            title="ยกเลิกข้าม"
          >
            <Undo2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="text-right font-mono font-semibold tabular-nums">{fmt(item.baseAmount)}</div>
      <div className="text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">
        {item.vatAmount > 0 ? fmt(item.vatAmount) : ""}
      </div>
    </div>
  );
}

export const CenterCell = memo(CenterCellInner, (prev, next) =>
  prev.pair === next.pair && prev.canLink === next.canLink
);

export const SystemRow = memo(SystemRowInner, (prev, next) =>
  prev.item === next.item &&
  prev.isSelected === next.isSelected &&
  prev.isSelectable === next.isSelectable &&
  prev.showCompanyBadge === next.showCompanyBadge
);

export const AccountingRowCell = memo(AccountingRowCellInner, (prev, next) =>
  prev.item === next.item &&
  prev.isSelected === next.isSelected &&
  prev.isSelectable === next.isSelectable &&
  prev.isSkipped === next.isSkipped
);
