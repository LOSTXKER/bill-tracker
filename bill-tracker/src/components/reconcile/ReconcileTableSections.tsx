"use client";

import {
  CheckCircle2,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchedPair } from "./reconcile-table-types";
import { SYS_GRID, fmt } from "./reconcile-table-types";
import { SystemRow, AccountingRowCell, CenterCell } from "./ReconcileTableRows";

export function AISuggestionsSection({
  aiPairs,
  showCompanyBadge,
  onPreview,
  onConfirmAI,
  onRejectAI,
  onUnlink,
}: {
  aiPairs: MatchedPair[];
  showCompanyBadge?: boolean;
  onPreview: (id: string) => void;
  onConfirmAI: (id: string) => void;
  onRejectAI: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
  if (aiPairs.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-[1fr_88px_1fr] bg-amber-50/60 dark:bg-amber-950/20">
        <div className="col-span-3 px-3 py-1.5 border-y border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5" />
            AI แนะนำ — รอยืนยัน ({aiPairs.length} รายการ)
          </div>
        </div>
      </div>
      {aiPairs.map((pair) => (
        <div
          key={pair.id}
          className="grid grid-cols-[1fr_88px_1fr] bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors"
        >
          <div className="border-r border-border">
            <SystemRow
              item={pair.systemItem}
              isSelected={false}
              isSelectable={false}
              onSelect={() => {}}
              showCompanyBadge={showCompanyBadge}
              onPreview={pair.systemItem ? () => onPreview(pair.systemItem!.id) : undefined}
            />
          </div>
          <div className="border-r border-border">
            <CenterCell pair={pair} canLink={false} onConfirmAI={onConfirmAI} onRejectAI={onRejectAI} onUnlink={onUnlink} />
          </div>
          <AccountingRowCell item={pair.accountingItem} isSelected={false} isSelectable={false} onSelect={() => {}} />
        </div>
      ))}
    </>
  );
}

export function UnmatchedSection({
  unmatchedSystem,
  unmatchedAccounting,
  allUnmatchedSystem,
  maxUnmatched,
  selectedSystemId,
  selectedAccountingIndex,
  onSelectSystem,
  onSelectAccounting,
  showCompanyBadge,
  onPreview,
  toggleSkip,
}: {
  unmatchedSystem: MatchedPair[];
  unmatchedAccounting: MatchedPair[];
  allUnmatchedSystem: MatchedPair[];
  maxUnmatched: number;
  selectedSystemId: string | null;
  selectedAccountingIndex: number | null;
  onSelectSystem: (id: string | null) => void;
  onSelectAccounting: (index: number | null) => void;
  showCompanyBadge?: boolean;
  onPreview: (id: string) => void;
  toggleSkip: (index: number) => void;
}) {
  if (allUnmatchedSystem.length === 0 && unmatchedAccounting.length === 0) return null;
  return (
    <>
      <div className="px-3 py-1 border-y border-muted bg-muted/30">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <AlertTriangle className="h-3 w-3 text-orange-500" />
          ยังไม่ตรงกัน (ระบบ {unmatchedSystem.length} | รายงาน {unmatchedAccounting.length})
        </div>
      </div>
      {Array.from({ length: maxUnmatched }, (_, i) => {
        const sysPair = unmatchedSystem[i] ?? null;
        const accPair = unmatchedAccounting[i] ?? null;
        const isSysSelected = sysPair?.systemItem?.id === selectedSystemId && !!selectedSystemId;
        const isAccSelected = accPair?.accountingIndex === selectedAccountingIndex && selectedAccountingIndex !== null;

        return (
          <div key={`unmatched-${i}`} className="grid grid-cols-[1fr_88px_1fr] transition-colors">
            <div className={cn("border-r border-border", isSysSelected && "bg-primary/5")}>
              <SystemRow
                item={sysPair?.systemItem}
                isSelected={isSysSelected}
                isSelectable={!!sysPair}
                onSelect={() => {
                  if (!sysPair?.systemItem) return;
                  onSelectSystem(sysPair.systemItem.id === selectedSystemId ? null : sysPair.systemItem.id);
                }}
                showCompanyBadge={showCompanyBadge}
                onPreview={sysPair?.systemItem ? () => onPreview(sysPair.systemItem!.id) : undefined}
              />
            </div>
            <div className="border-r border-border">
              <div className="flex items-center justify-center px-1 py-1.5">
                {isSysSelected && isAccSelected ? (
                  <span className="text-[10px] text-primary font-medium text-center leading-tight">จับคู่</span>
                ) : isSysSelected || isAccSelected ? (
                  <span className="text-[10px] text-primary font-medium text-center leading-tight">เลือก<br />อีกฝั่ง</span>
                ) : (
                  <span className="text-muted-foreground/30 text-lg">—</span>
                )}
              </div>
            </div>
            <div className={cn(isAccSelected && "bg-amber-50/60 dark:bg-amber-950/20")}>
              <AccountingRowCell
                item={accPair?.accountingItem}
                isSelected={isAccSelected}
                isSelectable={!!accPair}
                onSelect={() => {
                  if (accPair?.accountingIndex === undefined) return;
                  onSelectAccounting(accPair.accountingIndex === selectedAccountingIndex ? null : accPair.accountingIndex);
                }}
                onSkip={accPair?.accountingIndex !== undefined ? () => toggleSkip(accPair.accountingIndex!) : undefined}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

export function SkippedSection({
  skippedPairs,
  showSkipped,
  onToggleShowSkipped,
  toggleSkip,
}: {
  skippedPairs: MatchedPair[];
  showSkipped: boolean;
  onToggleShowSkipped: () => void;
  toggleSkip: (index: number) => void;
}) {
  if (skippedPairs.length === 0) return null;
  return (
    <>
      <div className="bg-muted/20">
        <div className="px-3 py-1.5 border-y border-muted/60">
          <button
            type="button"
            onClick={onToggleShowSkipped}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {showSkipped ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <EyeOff className="h-3.5 w-3.5" />
            ข้ามแล้ว ({skippedPairs.length} รายการ)
          </button>
        </div>
      </div>
      {showSkipped && skippedPairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-[1fr_88px_1fr] opacity-40 hover:opacity-60 transition-opacity">
          <div className="border-r border-border">
            <div className={cn(SYS_GRID, "items-center px-2 py-1.5 h-8")}>
              <div /><div /><div /><div /><div />
            </div>
          </div>
          <div className="border-r border-border" />
          <AccountingRowCell
            item={pair.accountingItem}
            isSelected={false}
            isSelectable={false}
            onSelect={() => {}}
            onSkip={pair.accountingIndex !== undefined ? () => toggleSkip(pair.accountingIndex!) : undefined}
            isSkipped
          />
        </div>
      ))}
    </>
  );
}

export function MatchedSection({
  matchedPairs,
  showCompanyBadge,
  onPreview,
  onConfirmAI,
  onRejectAI,
  onUnlink,
}: {
  matchedPairs: MatchedPair[];
  showCompanyBadge?: boolean;
  onPreview: (id: string) => void;
  onConfirmAI: (id: string) => void;
  onRejectAI: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
  if (matchedPairs.length === 0) return null;
  return (
    <>
      <div className="bg-emerald-50/30 dark:bg-emerald-950/10">
        <div className="px-3 py-1.5 border-y border-emerald-200/60 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            จับคู่แล้ว ({matchedPairs.length} รายการ)
          </div>
        </div>
      </div>
      {matchedPairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-[1fr_88px_1fr] hover:bg-muted/20 transition-colors">
          <div className="border-r border-border">
            <SystemRow
              item={pair.systemItem}
              isSelected={false}
              isSelectable={false}
              onSelect={() => {}}
              showCompanyBadge={showCompanyBadge}
              onPreview={pair.systemItem ? () => onPreview(pair.systemItem!.id) : undefined}
            />
          </div>
          <div className="border-r border-border">
            <CenterCell pair={pair} canLink={false} onConfirmAI={onConfirmAI} onRejectAI={onRejectAI} onUnlink={onUnlink} />
          </div>
          <AccountingRowCell item={pair.accountingItem} isSelected={false} isSelectable={false} onSelect={() => {}} />
        </div>
      ))}
    </>
  );
}

export function TotalsFooter({ pairs }: { pairs: MatchedPair[] }) {
  return (
    <div className="grid grid-cols-[1fr_88px_1fr] bg-muted/50 border-t-2 border-border">
      <div className="px-3 py-2 flex items-center justify-between border-r border-border">
        <span className="text-xs text-muted-foreground">
          รวม {pairs.filter((p) => p.systemItem).length} รายการ
        </span>
        <span className="text-sm font-mono font-semibold">
          {fmt(pairs.reduce((s, p) => s + (p.systemItem?.baseAmount ?? 0), 0))}
        </span>
      </div>
      <div className="border-r border-border" />
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          รวม {pairs.filter((p) => p.accountingItem).length} รายการ
        </span>
        <span className="text-sm font-mono font-semibold">
          {fmt(pairs.reduce((s, p) => s + (p.accountingItem?.baseAmount ?? 0), 0))}
        </span>
      </div>
    </div>
  );
}
