"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TransactionPreviewSheet } from "@/components/transactions/TransactionPreviewSheet";
import type { ReconcileTableProps } from "./reconcile-table-types";
import {
  SYS_GRID,
  ACC_GRID,
  MONTHS,
  RANGE_PRESETS,
  isWithinMonthRange,
} from "./reconcile-table-types";
import type { MonthRange } from "./reconcile-table-types";
import { SelectionActionBar, NoAccountingDataView } from "./ReconcileTableHeader";
import {
  AISuggestionsSection,
  UnmatchedSection,
  SkippedSection,
  MatchedSection,
  TotalsFooter,
} from "./ReconcileTableSections";

export type { SystemItem, MatchStatus, MatchedPair, MonthRange } from "./reconcile-table-types";
export { RANGE_PRESETS } from "./reconcile-table-types";

export function ReconcileTable({
  pairs,
  systemItems: systemItemsProp,
  onConfirmAI,
  onRejectAI,
  onManualLink,
  onUnlink,
  selectedSystemId,
  selectedAccountingIndex,
  onSelectSystem,
  onSelectAccounting,
  month,
  year,
  type,
  onShowImport,
  hasAccountingData,
  showCompanyBadge,
  companyCode,
  monthRange: monthRangeProp,
  onMonthRangeChange,
  onSpilloverInfo,
}: ReconcileTableProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [monthRangeLocal, setMonthRangeLocal] = useState<MonthRange>(0);
  const monthRange = monthRangeProp ?? monthRangeLocal;
  const setMonthRange = onMonthRangeChange ?? setMonthRangeLocal;
  const [skippedAccounting, setSkippedAccounting] = useState<Set<number>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);

  const toggleSkip = (index: number) => {
    setSkippedAccounting((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handlePreview = (itemId: string) => {
    setPreviewId(itemId);
    setPreviewOpen(true);
  };

  const canLink = selectedSystemId !== null && selectedAccountingIndex !== null;
  const hasOneSelected =
    (selectedSystemId !== null) !== (selectedAccountingIndex !== null);

  const selectedSysItem = pairs.find(
    (p) => p.status === "system-only" && p.systemItem?.id === selectedSystemId
  )?.systemItem;
  const selectedAccItem = pairs.find(
    (p) =>
      p.status === "accounting-only" &&
      p.accountingIndex === selectedAccountingIndex
  )?.accountingItem;

  const aiPairs = pairs.filter((p) => p.status === "ai" && p.userConfirmed === undefined);
  const unmatchedPairs = pairs.filter(
    (p) => p.status === "system-only" || p.status === "accounting-only"
  );
  const allUnmatchedSystem = unmatchedPairs
    .filter((p) => p.status === "system-only")
    .sort((a, b) => (a.systemItem?.date ?? "").localeCompare(b.systemItem?.date ?? ""));
  const allUnmatchedAccounting = unmatchedPairs
    .filter((p) => p.status === "accounting-only")
    .sort((a, b) => (a.accountingItem?.date ?? "").localeCompare(b.accountingItem?.date ?? ""));
  const unmatchedAccounting = allUnmatchedAccounting.filter(
    (p) => p.accountingIndex === undefined || !skippedAccounting.has(p.accountingIndex)
  );
  const skippedAccountingPairs = allUnmatchedAccounting.filter(
    (p) => p.accountingIndex !== undefined && skippedAccounting.has(p.accountingIndex)
  );

  const currentMonthSystem = allUnmatchedSystem.filter((p) => !p.systemItem?.fromMonth);
  const spilloverSystem = allUnmatchedSystem.filter((p) => !!p.systemItem?.fromMonth);

  const filteredSpillover = spilloverSystem.filter(
    (p) => isWithinMonthRange(p.systemItem!.fromMonth!, month, monthRange)
  );
  const unmatchedSystem = [...currentMonthSystem, ...filteredSpillover]
    .sort((a, b) => (a.systemItem?.date ?? "").localeCompare(b.systemItem?.date ?? ""));
  const maxUnmatched = Math.max(unmatchedSystem.length, unmatchedAccounting.length);

  const presetCounts = useMemo(() => {
    const counts = new Map<MonthRange, number>();
    for (const preset of RANGE_PRESETS) {
      if (preset.value === 0) {
        counts.set(0, currentMonthSystem.length);
      } else {
        counts.set(
          preset.value,
          spilloverSystem.filter(
            (p) => isWithinMonthRange(p.systemItem!.fromMonth!, month, preset.value)
          ).length
        );
      }
    }
    return counts;
  }, [currentMonthSystem.length, spilloverSystem, month]);

  const prevSpilloverKey = useRef("");
  useEffect(() => {
    const hasSpillover = spilloverSystem.length > 0;
    const key = `${hasSpillover}|${Array.from(presetCounts.entries()).map(([k, v]) => `${k}:${v}`).join(",")}`;
    if (key !== prevSpilloverKey.current) {
      prevSpilloverKey.current = key;
      onSpilloverInfo?.({ hasSpillover, presetCounts });
    }
  });

  const matchedPairs = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed === true)
  );

  const orderedPairs = [...aiPairs, ...unmatchedPairs, ...matchedPairs];

  const typeLabel = type === "EXPENSE" ? "ภาษีซื้อ" : type === "INCOME" ? "ภาษีขาย" : "ภพ.36";
  const monthLabel = MONTHS[month - 1];
  const yearLabel = year + 543;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <SelectionActionBar
        canLink={canLink}
        hasOneSelected={hasOneSelected}
        selectedSysItem={selectedSysItem}
        selectedAccItem={selectedAccItem}
        selectedSystemId={selectedSystemId}
        selectedAccountingIndex={selectedAccountingIndex}
        onSelectSystem={onSelectSystem}
        onSelectAccounting={onSelectAccounting}
        onManualLink={onManualLink}
      />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_88px_1fr] border-b bg-muted/50">
        <div className={cn(SYS_GRID, "px-2 py-1.5 text-[11px] font-medium text-muted-foreground border-r border-border")}>
          <div />
          <div>วันที่</div>
          <div>ชื่อผู้ขาย</div>
          <div className="text-right">ยอดเงิน</div>
          <div className="text-right">VAT</div>
        </div>
        <div className="flex items-center justify-center text-[11px] font-medium text-muted-foreground border-r border-border">
          สถานะ
        </div>
        <div className={cn(ACC_GRID, "px-2 py-1.5 text-[11px] font-medium text-muted-foreground")}>
          <div>วันที่</div>
          <div>ชื่อผู้ขาย</div>
          <div className="text-right">ยอดเงิน</div>
          <div className="text-right">VAT</div>
        </div>
      </div>

      {!hasAccountingData ? (
        <NoAccountingDataView
          systemItems={systemItemsProp ?? []}
          showCompanyBadge={showCompanyBadge}
          onPreview={handlePreview}
          typeLabel={typeLabel}
          monthLabel={monthLabel}
          yearLabel={yearLabel}
          onShowImport={onShowImport}
        />
      ) : (
        <div
          className="divide-y divide-border/50 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 380px)" }}
        >
          <AISuggestionsSection
            aiPairs={aiPairs}
            showCompanyBadge={showCompanyBadge}
            onPreview={handlePreview}
            onConfirmAI={onConfirmAI}
            onRejectAI={onRejectAI}
            onUnlink={onUnlink}
          />

          <UnmatchedSection
            unmatchedSystem={unmatchedSystem}
            unmatchedAccounting={unmatchedAccounting}
            allUnmatchedSystem={allUnmatchedSystem}
            maxUnmatched={maxUnmatched}
            selectedSystemId={selectedSystemId}
            selectedAccountingIndex={selectedAccountingIndex}
            onSelectSystem={onSelectSystem}
            onSelectAccounting={onSelectAccounting}
            showCompanyBadge={showCompanyBadge}
            onPreview={handlePreview}
            toggleSkip={toggleSkip}
          />

          <SkippedSection
            skippedPairs={skippedAccountingPairs}
            showSkipped={showSkipped}
            onToggleShowSkipped={() => setShowSkipped(!showSkipped)}
            toggleSkip={toggleSkip}
          />

          <MatchedSection
            matchedPairs={matchedPairs}
            showCompanyBadge={showCompanyBadge}
            onPreview={handlePreview}
            onConfirmAI={onConfirmAI}
            onRejectAI={onRejectAI}
            onUnlink={onUnlink}
          />

          {orderedPairs.length > 0 && <TotalsFooter pairs={pairs} />}
        </div>
      )}

      <TransactionPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        transactionId={previewId}
        transactionType={type === "PP36" ? "expense" : type.toLowerCase() as "expense" | "income"}
        companyCode={companyCode}
      />
    </div>
  );
}
