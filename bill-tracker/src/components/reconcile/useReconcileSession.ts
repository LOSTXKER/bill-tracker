"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MatchedPair, MonthRange } from "./ReconcileTable";
import type { AccountingRow } from "./ImportPanel";
import type { ReconcileWorkspaceProps } from "./reconcile-types";
import { runAutoMatch, reconstructPairs } from "./reconcile-matching";
import { runAITextMatch, saveReconcileSession } from "./reconcile-actions";

export function useReconcileSession(props: ReconcileWorkspaceProps) {
  const {
    companyCode,
    year,
    month,
    type,
    systemExpenses,
    systemIncomes,
    spilloverExpenses = [],
    spilloverIncomes = [],
    siblingCompanies,
    savedSession,
    savedAccountingRows,
    savedMatches,
  } = props;

  const router = useRouter();

  const [accountingItems, setAccountingItems] = useState<AccountingRow[]>(
    savedAccountingRows ?? []
  );
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedAccountingIndex, setSelectedAccountingIndex] = useState<
    number | null
  >(null);
  const [vatOnly, setVatOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [monthRange, setMonthRange] = useState<MonthRange>(0);
  const [spilloverInfo, setSpilloverInfo] = useState<{
    hasSpillover: boolean;
    presetCounts: Map<MonthRange, number>;
  }>({ hasSpillover: false, presetCounts: new Map() });
  const [sourceFileName, setSourceFileName] = useState<string | null>(
    savedSession?.sourceFileName ?? null
  );
  const [sourceFileUrl] = useState<string | null>(
    savedSession?.sourceFileUrl ?? null
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(
    savedSession ? new Date() : null
  );

  const hasSiblings = !!siblingCompanies && siblingCompanies.length > 1;

  const allSystemItems =
    type === "INCOME"
      ? [...systemIncomes, ...spilloverIncomes]
      : [...systemExpenses, ...spilloverExpenses];

  const systemItems = useMemo(() => {
    let items = allSystemItems;
    if (vatOnly) items = items.filter((i) => i.vatAmount > 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.vendorName.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    type,
    systemExpenses,
    systemIncomes,
    spilloverExpenses,
    spilloverIncomes,
    vatOnly,
    searchQuery,
  ]);

  const hiddenByVatFilter = vatOnly
    ? allSystemItems.filter((i) => i.vatAmount === 0).length
    : 0;

  useEffect(() => {
    if (
      savedAccountingRows &&
      savedAccountingRows.length > 0 &&
      savedMatches &&
      savedMatches.length > 0
    ) {
      const items = vatOnly
        ? allSystemItems.filter((i) => i.vatAmount > 0)
        : allSystemItems;
      const reconstructed = reconstructPairs(
        items,
        savedAccountingRows,
        savedMatches,
        type
      );
      setPairs(reconstructed);
    } else if (savedAccountingRows && savedAccountingRows.length > 0) {
      const items = vatOnly
        ? allSystemItems.filter((i) => i.vatAmount > 0)
        : allSystemItems;
      const matched = runAutoMatch(items, savedAccountingRows);
      setPairs(matched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = useCallback(
    (rows: AccountingRow[], fileName?: string) => {
      setAccountingItems(rows);
      setSourceFileName(fileName ?? null);
      const matched = runAutoMatch(systemItems, rows);
      setPairs(matched);
      setSelectedSystemId(null);
      setSelectedAccountingIndex(null);
    },
    [systemItems]
  );

  const handleAIMatch = async () => {
    const canRun =
      pairs.some((p) => p.status === "system-only") &&
      pairs.some((p) => p.status === "accounting-only");
    if (!canRun) return;

    setIsAILoading(true);
    try {
      const { updatedPairs } = await runAITextMatch({ companyCode, pairs });
      setPairs(updatedPairs);
    } catch (err) {
      console.error("AI match error:", err);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSpilloverInfo = useCallback(
    (info: { hasSpillover: boolean; presetCounts: Map<MonthRange, number> }) => {
      setSpilloverInfo(info);
    },
    []
  );

  const handleConfirmAI = useCallback((id: string) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, userConfirmed: true } : p))
    );
  }, []);

  const splitPairBack = useCallback((id: string) => {
    setPairs((prev) => {
      return prev.flatMap((p) => {
        if (p.id !== id) return [p];
        const result: MatchedPair[] = [];
        if (p.systemItem) {
          result.push({
            id: `sys-${p.systemItem.id}`,
            systemItem: p.systemItem,
            status: "system-only",
          });
        }
        if (p.accountingItem !== undefined && p.accountingIndex !== undefined) {
          result.push({
            id: `acc-${p.accountingIndex}`,
            accountingItem: p.accountingItem,
            accountingIndex: p.accountingIndex,
            status: "accounting-only",
          });
        }
        return result;
      });
    });
  }, []);

  const handleManualLink = useCallback(
    (systemId: string, accountingIndex: number) => {
      setPairs((prev) => {
        const updated = prev.filter(
          (p) =>
            !(p.status === "system-only" && p.systemItem?.id === systemId) &&
            !(
              p.status === "accounting-only" &&
              p.accountingIndex === accountingIndex
            )
        );
        const sItem = systemItems.find((s) => s.id === systemId);
        const aItem = accountingItems[accountingIndex];
        if (sItem && aItem) {
          updated.push({
            id: `manual-${systemId}-${accountingIndex}`,
            systemItem: sItem,
            accountingItem: aItem,
            accountingIndex,
            status: "fuzzy",
            confidence: 1,
            aiReason: "จับคู่ด้วยตนเอง",
            userConfirmed: true,
          });
        }
        return updated;
      });
      setSelectedSystemId(null);
      setSelectedAccountingIndex(null);
    },
    [systemItems, accountingItems]
  );

  const handleReset = () => {
    setAccountingItems([]);
    setPairs([]);
    setSelectedSystemId(null);
    setSelectedAccountingIndex(null);
    setSourceFileName(null);
  };

  const unmatchedSystemCount = pairs.filter(
    (p) => p.status === "system-only"
  ).length;
  const unmatchedAccountingCount = pairs.filter(
    (p) => p.status === "accounting-only"
  ).length;
  const canAIMatch = unmatchedSystemCount > 0 && unmatchedAccountingCount > 0;

  const matchedPairsForSave = useMemo(
    () =>
      pairs.filter(
        (p) =>
          (p.status === "exact" ||
            p.status === "strong" ||
            p.status === "fuzzy" ||
            (p.status === "ai" && p.userConfirmed)) &&
          p.systemItem &&
          p.accountingItem
      ),
    [pairs]
  );
  const canSave = matchedPairsForSave.length > 0 || accountingItems.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await saveReconcileSession({
        companyCode,
        month,
        year,
        type,
        sourceFileName,
        sourceFileUrl,
        matchedPairs: matchedPairsForSave,
        systemItems,
        accountingItems,
        unmatchedSystemCount,
        unmatchedAccountingCount,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/${companyCode}/reconcile?year=${year}&type=${type}`);
  };

  const hasAccountingData = accountingItems.length > 0;

  return {
    router,
    accountingItems,
    pairs,
    showImport,
    setShowImport,
    isAILoading,
    selectedSystemId,
    selectedAccountingIndex,
    vatOnly,
    setVatOnly,
    searchQuery,
    setSearchQuery,
    isSaving,
    monthRange,
    setMonthRange,
    spilloverInfo,
    sourceFileName,
    lastSaved,
    hasSiblings,
    systemItems,
    hiddenByVatFilter,
    hasAccountingData,
    unmatchedSystemCount,
    unmatchedAccountingCount,
    canAIMatch,
    matchedPairsForSave,
    canSave,
    handleImport,
    handleAIMatch,
    handleSpilloverInfo,
    handleConfirmAI,
    handleRejectAI: splitPairBack,
    handleManualLink,
    handleUnlink: splitPairBack,
    handleReset,
    handleSave,
    handleBack,
    setSelectedSystemId,
    setSelectedAccountingIndex,
    setAccountingItems,
    setPairs,
  };
}

export type ReconcileSessionReturn = ReturnType<typeof useReconcileSession>;
