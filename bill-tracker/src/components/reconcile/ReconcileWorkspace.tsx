"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Search,
  Receipt,
  Building2,
  ChevronsUpDown,
  Save,
  ArrowLeft,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportPanel, type AccountingRow } from "./ImportPanel";
import {
  ReconcileTable,
  type MatchedPair,
  type SystemItem,
} from "./ReconcileTable";
import { cn } from "@/lib/utils";

export interface SiblingCompany {
  code: string;
  name: string;
}

interface SavedSession {
  id: string;
  status: string;
  sourceFileName: string | null;
  sourceFileUrl: string | null;
  matchedCount: number;
}

interface SavedMatch {
  id: string;
  expenseId: string | null;
  incomeId: string | null;
  systemAmount: number;
  systemVat: number;
  systemVendor: string;
  acctDate: string;
  acctInvoice: string | null;
  acctVendor: string;
  acctTaxId: string | null;
  acctBase: number;
  acctVat: number;
  acctTotal: number;
  matchType: string;
  confidence?: number;
  aiReason: string | null;
  amountDiff?: number;
  isPayOnBehalf: boolean;
  payOnBehalfFrom: string | null;
  payOnBehalfTo: string | null;
  status: string;
  matchedByName: string | null;
}

interface ReconcileWorkspaceProps {
  companyCode: string;
  year: number;
  month: number;
  type: "expense" | "income" | "pp36";
  systemExpenses: SystemItem[];
  systemIncomes: SystemItem[];
  spilloverExpenses?: SystemItem[];
  spilloverIncomes?: SystemItem[];
  siblingCompanies?: SiblingCompany[];
  selectedCompanyCodes?: string[];
  savedSession?: SavedSession;
  savedAccountingRows?: AccountingRow[];
  savedMatches?: SavedMatch[];
}

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function formatAmt(n: number) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Match Algorithm (same as ReconcileView)
// ---------------------------------------------------------------------------

function daysBetween(dateA: string, dateB: string): number {
  try {
    const a = new Date(dateA).getTime();
    const b = new Date(dateB).getTime();
    return Math.abs((a - b) / 86400000);
  } catch {
    return Infinity;
  }
}

function runAutoMatch(
  systemItems: SystemItem[],
  accountingItems: AccountingRow[]
): MatchedPair[] {
  const usedAccounting = new Set<number>();
  const usedSystem = new Set<string>();
  const pairs: MatchedPair[] = [];

  systemItems.forEach((sItem) => {
    if (!sItem.invoiceNumber || usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx) || !aItem.invoiceNumber) return;
      if (
        sItem.invoiceNumber.trim().toLowerCase() ===
        aItem.invoiceNumber.trim().toLowerCase()
      ) {
        pairs.push({
          id: `pair-${sItem.id}-${aIdx}`,
          systemItem: sItem,
          accountingItem: aItem,
          accountingIndex: aIdx,
          status: "exact",
          confidence: 1,
        });
        usedAccounting.add(aIdx);
        usedSystem.add(sItem.id);
      }
    });
  });

  systemItems.forEach((sItem) => {
    if (!sItem.taxId || usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx) || !aItem.taxId) return;
      if (
        sItem.taxId.replace(/\D/g, "") === aItem.taxId.replace(/\D/g, "") &&
        Math.abs(sItem.baseAmount - aItem.baseAmount) < 0.01
      ) {
        pairs.push({
          id: `pair-${sItem.id}-${aIdx}`,
          systemItem: sItem,
          accountingItem: aItem,
          accountingIndex: aIdx,
          status: "strong",
          confidence: 0.95,
        });
        usedAccounting.add(aIdx);
        usedSystem.add(sItem.id);
      }
    });
  });

  systemItems.forEach((sItem) => {
    if (usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx)) return;
      if (
        Math.abs(sItem.baseAmount - aItem.baseAmount) < 0.01 &&
        Math.abs(sItem.vatAmount - aItem.vatAmount) < 0.01 &&
        daysBetween(sItem.date, aItem.date) <= 3
      ) {
        pairs.push({
          id: `pair-${sItem.id}-${aIdx}`,
          systemItem: sItem,
          accountingItem: aItem,
          accountingIndex: aIdx,
          status: "fuzzy",
          confidence: 0.8,
        });
        usedAccounting.add(aIdx);
        usedSystem.add(sItem.id);
      }
    });
  });

  systemItems.forEach((sItem) => {
    if (!usedSystem.has(sItem.id)) {
      pairs.push({
        id: `sys-${sItem.id}`,
        systemItem: sItem,
        status: "system-only",
      });
    }
  });

  accountingItems.forEach((aItem, aIdx) => {
    if (!usedAccounting.has(aIdx)) {
      pairs.push({
        id: `acc-${aIdx}`,
        accountingItem: aItem,
        accountingIndex: aIdx,
        status: "accounting-only",
      });
    }
  });

  return pairs;
}

// ---------------------------------------------------------------------------
// Reconstruct pairs from saved matches
// ---------------------------------------------------------------------------

function reconstructPairs(
  systemItems: SystemItem[],
  accountingItems: AccountingRow[],
  savedMatches: SavedMatch[],
  type: "expense" | "income" | "pp36"
): MatchedPair[] {
  const usedSystem = new Set<string>();
  const usedAccounting = new Set<number>();
  const pairs: MatchedPair[] = [];

  for (const m of savedMatches) {
    const systemId = type === "income" ? m.incomeId : m.expenseId;
    const sItem = systemId
      ? systemItems.find((s) => s.id === systemId)
      : undefined;

    const aIdx = accountingItems.findIndex(
      (a) =>
        a.vendorName === m.acctVendor &&
        Math.abs(a.baseAmount - m.acctBase) < 0.01 &&
        a.date === m.acctDate &&
        !usedAccounting.has(accountingItems.indexOf(a))
    );

    const aItem = aIdx >= 0 ? accountingItems[aIdx] : undefined;

    if (sItem && aItem) {
      const status =
        m.matchType === "ai"
          ? "ai"
          : m.matchType === "exact"
            ? "exact"
            : m.matchType === "strong"
              ? "strong"
              : "fuzzy";

      pairs.push({
        id: `saved-${m.id}`,
        systemItem: sItem,
        accountingItem: aItem,
        accountingIndex: aIdx,
        status: status as any,
        confidence: m.confidence ?? 1,
        aiReason: m.aiReason ?? undefined,
        userConfirmed: m.status === "confirmed" ? true : undefined,
        matchedByName: m.matchedByName,
      });
      usedSystem.add(sItem.id);
      usedAccounting.add(aIdx);
    }
  }

  systemItems.forEach((sItem) => {
    if (!usedSystem.has(sItem.id)) {
      pairs.push({
        id: `sys-${sItem.id}`,
        systemItem: sItem,
        status: "system-only",
      });
    }
  });

  accountingItems.forEach((aItem, aIdx) => {
    if (!usedAccounting.has(aIdx)) {
      pairs.push({
        id: `acc-${aIdx}`,
        accountingItem: aItem,
        accountingIndex: aIdx,
        status: "accounting-only",
      });
    }
  });

  return pairs;
}

// ---------------------------------------------------------------------------
// Summary Bar
// ---------------------------------------------------------------------------

function SummaryBar({
  pairs,
  systemItems,
  accountingItems,
}: {
  pairs: MatchedPair[];
  systemItems: SystemItem[];
  accountingItems: AccountingRow[];
}) {
  const systemTotal = systemItems.reduce((s, i) => s + i.baseAmount, 0);
  const systemVat = systemItems.reduce((s, i) => s + i.vatAmount, 0);
  const accountingTotal = accountingItems.reduce(
    (s, i) => s + i.baseAmount,
    0
  );
  const accountingVat = accountingItems.reduce((s, i) => s + i.vatAmount, 0);

  const matched = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed)
  ).length;
  const systemOnly = pairs.filter((p) => p.status === "system-only").length;
  const accountingOnly = pairs.filter(
    (p) => p.status === "accounting-only"
  ).length;
  const aiPending = pairs.filter(
    (p) => p.status === "ai" && p.userConfirmed === undefined
  ).length;

  const totalDiff = Math.abs(systemTotal - accountingTotal);
  const vatDiff = Math.abs(systemVat - accountingVat);
  const isBalanced = totalDiff < 0.01 && vatDiff < 0.01;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">ระบบ:</span>
        <span className="font-semibold">{formatAmt(systemTotal)}</span>
        <span className="text-xs text-muted-foreground">({systemItems.length})</span>
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
            <span className={cn("font-medium", isBalanced ? "text-emerald-600" : "text-amber-600")}>
              ต่าง {formatAmt(totalDiff)}
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">รายงาน:</span>
            <span className="font-semibold">{formatAmt(accountingTotal)}</span>
            <span className="text-xs text-muted-foreground">({accountingItems.length})</span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {matched}
            {aiPending > 0 && (
              <>
                <Zap className="h-3 w-3 text-amber-500 ml-1" /> {aiPending}
              </>
            )}
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">ยังไม่มีข้อมูลรายงาน</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ReconcileWorkspace({
  companyCode,
  year,
  month,
  type,
  systemExpenses,
  systemIncomes,
  spilloverExpenses = [],
  spilloverIncomes = [],
  siblingCompanies,
  selectedCompanyCodes,
  savedSession,
  savedAccountingRows,
  savedMatches,
}: ReconcileWorkspaceProps) {
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
  const [sourceFileName, setSourceFileName] = useState<string | null>(
    savedSession?.sourceFileName ?? null
  );
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(
    savedSession?.sourceFileUrl ?? null
  );

  const [lastSaved, setLastSaved] = useState<Date | null>(
    savedSession ? new Date() : null
  );

  const hasSiblings = !!siblingCompanies && siblingCompanies.length > 1;

  const allSystemItems = type === "income"
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
  }, [allSystemItems, vatOnly, searchQuery]);

  const hiddenByVatFilter = vatOnly
    ? allSystemItems.filter((i) => i.vatAmount === 0).length
    : 0;

  // Reconstruct pairs from saved data on mount
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
    // Only run on mount
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

  // --- AI text match ---
  const handleAIMatch = async () => {
    const unmatchedSystem = pairs
      .filter((p) => p.status === "system-only")
      .map((p) => p.systemItem!)
      .filter(Boolean);
    const unmatchedAccounting = pairs
      .filter((p) => p.status === "accounting-only")
      .map((p) => ({ ...p.accountingItem!, _idx: p.accountingIndex! }));

    if (!unmatchedSystem.length || !unmatchedAccounting.length) return;

    setIsAILoading(true);
    try {
      const res = await fetch(`/api/${companyCode}/reconcile/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemItems: unmatchedSystem.map((s) => ({
            id: s.id,
            vendorName: s.vendorName,
            amount: s.baseAmount,
            vatAmount: s.vatAmount,
            date: s.date,
            taxId: s.taxId,
            description: s.description,
            isPayOnBehalf: s.isPayOnBehalf,
            paidByCompany: s.payOnBehalfFrom,
          })),
          accountingItems: unmatchedAccounting.map((a) => ({
            vendorName: a.vendorName,
            amount: a.baseAmount,
            vatAmount: a.vatAmount,
            date: a.date,
            taxId: a.taxId,
          })),
        }),
      });

      if (!res.ok) throw new Error("AI request failed");
      const json = await res.json();
      const suggestions = json.data?.suggestions ?? [];

      if (suggestions.length === 0) return;

      setPairs((prev) => {
        const updated = [...prev];
        const usedAccountingInAI = new Set<number>();

        suggestions.forEach(
          (s: {
            systemId: string;
            accountingIndex: number;
            confidence: number;
            reason: string;
          }) => {
            const accountingEntry = unmatchedAccounting[s.accountingIndex];
            if (!accountingEntry) return;
            const realIdx = accountingEntry._idx;
            if (usedAccountingInAI.has(realIdx)) return;

            const sysIdx = updated.findIndex(
              (p) =>
                p.status === "system-only" && p.systemItem?.id === s.systemId
            );
            const accIdx = updated.findIndex(
              (p) =>
                p.status === "accounting-only" && p.accountingIndex === realIdx
            );

            if (sysIdx === -1 || accIdx === -1) return;

            const merged: MatchedPair = {
              id: `ai-${s.systemId}-${realIdx}`,
              systemItem: updated[sysIdx].systemItem,
              accountingItem: updated[accIdx].accountingItem,
              accountingIndex: realIdx,
              status: "ai",
              confidence: s.confidence,
              aiReason: s.reason,
              userConfirmed: undefined,
            };

            updated.splice(Math.max(sysIdx, accIdx), 1);
            updated.splice(Math.min(sysIdx, accIdx), 1, merged);
            usedAccountingInAI.add(realIdx);
          }
        );

        return updated;
      });
    } catch (err) {
      console.error("AI match error:", err);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleConfirmAI = useCallback((id: string) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, userConfirmed: true } : p))
    );
  }, []);

  const handleRejectAI = useCallback((id: string) => {
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

  const handleUnlink = useCallback((id: string) => {
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
      // Upload file if we have a file name but no URL yet
      let fileUrl = sourceFileUrl;

      const systemTotal = systemItems.reduce((s, i) => s + i.baseAmount, 0);
      const accountingTotal = accountingItems.reduce(
        (s, i) => s + i.baseAmount,
        0
      );

      const matches = matchedPairsForSave.map((p) => ({
        expenseId: type !== "income" ? p.systemItem!.id : undefined,
        incomeId: type === "income" ? p.systemItem!.id : undefined,
        systemAmount: p.systemItem!.baseAmount,
        systemVat: p.systemItem!.vatAmount,
        systemVendor:
          p.systemItem!.vendorName || p.systemItem!.description || "",
        acctDate: p.accountingItem!.date,
        acctInvoice: p.accountingItem!.invoiceNumber || undefined,
        acctVendor: p.accountingItem!.vendorName,
        acctTaxId: p.accountingItem!.taxId || undefined,
        acctBase: p.accountingItem!.baseAmount,
        acctVat: p.accountingItem!.vatAmount,
        acctTotal: p.accountingItem!.totalAmount,
        matchType: p.status === "ai" ? "ai" : p.status,
        confidence: p.confidence,
        aiReason: p.aiReason,
        amountDiff:
          p.systemItem && p.accountingItem
            ? Math.abs(p.systemItem.baseAmount - p.accountingItem.baseAmount)
            : undefined,
        isPayOnBehalf: p.systemItem!.isPayOnBehalf ?? false,
        payOnBehalfFrom: p.systemItem!.payOnBehalfFrom ?? undefined,
        payOnBehalfTo: p.systemItem!.payOnBehalfTo ?? undefined,
        status: "confirmed",
      }));

      const res = await fetch(`/api/${companyCode}/reconcile/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          type,
          sourceFileName,
          sourceFileUrl: fileUrl,
          matches,
          accountingRows: accountingItems.map((a) => ({
            date: a.date,
            invoiceNumber: a.invoiceNumber || undefined,
            vendorName: a.vendorName,
            taxId: a.taxId || undefined,
            baseAmount: a.baseAmount,
            vatAmount: a.vatAmount,
            totalAmount: a.totalAmount,
          })),
          totalSystemAmount: systemTotal,
          totalAccountAmount: accountingTotal,
          unmatchedSystemCount,
          unmatchedAccountCount: unmatchedAccountingCount,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
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
  const monthName = MONTHS[month - 1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {type === "expense" ? "ภาษีซื้อ" : type === "income" ? "ภาษีขาย" : "ภพ.36"} {monthName}{" "}
            {year + 543}
          </h2>
          {savedSession && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                savedSession.status === "COMPLETED"
                  ? "text-emerald-600 border-emerald-200"
                  : "text-amber-600 border-amber-200"
              )}
            >
              {savedSession.status === "COMPLETED"
                ? "เสร็จสิ้น"
                : "กำลังทำ"}
            </Badge>
          )}
        </div>

        <div className="flex-1" />

        {lastSaved && (
          <span className="text-xs text-muted-foreground">
            บันทึกล่าสุด{" "}
            {lastSaved.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Compact import bar */}
      {hasAccountingData ? (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-muted-foreground">
            ไฟล์: <span className="font-medium text-foreground">{sourceFileName || "ไม่ระบุ"}</span>
            {" "}({accountingItems.length} รายการ)
          </span>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setShowImport(true)}
          >
            เปลี่ยน
          </button>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Upload className="h-6 w-6 text-muted-foreground/60" />
            <div className="text-center">
              <p className="text-sm font-semibold">นำเข้ารายงานบัญชี</p>
              <p className="text-xs text-muted-foreground mt-1">
                อัปโหลดไฟล์ PDF หรือ Excel จากรายงานภาษีของสำนักงานบัญชี
              </p>
            </div>
            <Button size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" />
              เลือกไฟล์
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        {hasSiblings && siblingCompanies && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {selectedCompanyCodes &&
                selectedCompanyCodes.length < siblingCompanies.length
                  ? `${selectedCompanyCodes.length} บริษัท`
                  : "ทุกบริษัท"}
                <ChevronsUpDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground px-2 pb-2">
                นิติบุคคลเดียวกัน (Tax ID)
              </p>
              <div className="space-y-1">
                {siblingCompanies.map((sc) => {
                  const isChecked = selectedCompanyCodes
                    ? selectedCompanyCodes.includes(sc.code)
                    : true;
                  return (
                    <label
                      key={sc.code}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer"
                    >
                      <Checkbox checked={isChecked} />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 h-4 font-mono flex-shrink-0"
                        >
                          {sc.code}
                        </Badge>
                        <span className="text-sm truncate">{sc.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          variant={vatOnly ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => {
            setVatOnly((v) => !v);
            setPairs([]);
            setAccountingItems([]);
          }}
          title="กรองเฉพาะรายการที่มี VAT"
        >
          <Receipt className="h-3.5 w-3.5" />
          เฉพาะ VAT
          {vatOnly && hiddenByVatFilter > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 h-4 ml-0.5"
            >
              ซ่อน {hiddenByVatFilter}
            </Badge>
          )}
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ..."
            className="h-9 pl-8 w-40 text-sm"
          />
        </div>

        <div className="flex-1" />

        {hasAccountingData && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9"
              onClick={handleAIMatch}
              disabled={!canAIMatch || isAILoading}
            >
              {isAILoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 text-amber-500" />
              )}
              AI จับคู่
              {canAIMatch && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 h-4"
                >
                  {unmatchedSystemCount + unmatchedAccountingCount}
                </Badge>
              )}
            </Button>

            <Button
              variant="default"
              size="sm"
              className="gap-2 h-9"
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              บันทึก
              {matchedPairsForSave.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 h-4"
                >
                  {matchedPairsForSave.length}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  รีเซ็ต
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowImport(true)}>
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  โหลดไฟล์ใหม่
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Summary bar */}
      <SummaryBar
        pairs={pairs}
        systemItems={systemItems}
        accountingItems={accountingItems}
      />

      {/* Table */}
      <ReconcileTable
        pairs={pairs}
        onConfirmAI={handleConfirmAI}
        onRejectAI={handleRejectAI}
        onManualLink={handleManualLink}
        onUnlink={handleUnlink}
        selectedSystemId={selectedSystemId}
        selectedAccountingIndex={selectedAccountingIndex}
        onSelectSystem={setSelectedSystemId}
        onSelectAccounting={setSelectedAccountingIndex}
        month={month}
        year={year}
        type={type}
        onShowImport={() => setShowImport(true)}
        hasAccountingData={hasAccountingData}
        showCompanyBadge={hasSiblings}
        companyCode={companyCode}
      />

      {/* Import dialog */}
      <ImportPanel
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        companyCode={companyCode}
        month={month}
        year={year}
        type={type === "pp36" ? "expense" : type}
      />
    </div>
  );
}
