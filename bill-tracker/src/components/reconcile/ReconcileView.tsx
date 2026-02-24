"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Zap,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  Loader2,
  RotateCcw,
  Search,
  Receipt,
  Building2,
  ChevronsUpDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportPanel, type AccountingRow } from "./ImportPanel";
import { ReconcileTable, type MatchedPair, type SystemItem, type MatchStatus } from "./ReconcileTable";
import { cn } from "@/lib/utils";

export interface SiblingCompany {
  code: string;
  name: string;
}

interface ReconcileViewProps {
  companyCode: string;
  year: number;
  month: number;
  type: "expense" | "income";
  systemExpenses: SystemItem[];
  systemIncomes: SystemItem[];
  siblingCompanies?: SiblingCompany[];
  selectedCompanyCodes?: string[];
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

function formatAmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Match Algorithm
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

  // Pass 1: Exact invoice number match
  systemItems.forEach((sItem) => {
    if (!sItem.invoiceNumber || usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx) || !aItem.invoiceNumber) return;
      if (
        sItem.invoiceNumber.trim().toLowerCase() === aItem.invoiceNumber.trim().toLowerCase()
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

  // Pass 2: Tax ID + amount match
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

  // Pass 3: Amount + date within 3 days
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

  // Remaining system-only
  systemItems.forEach((sItem) => {
    if (!usedSystem.has(sItem.id)) {
      pairs.push({
        id: `sys-${sItem.id}`,
        systemItem: sItem,
        status: "system-only",
      });
    }
  });

  // Remaining accounting-only
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
// Summary Bar Component
// ---------------------------------------------------------------------------

interface SummaryBarProps {
  pairs: MatchedPair[];
  systemItems: SystemItem[];
  accountingItems: AccountingRow[];
}

function SummaryBar({ pairs, systemItems, accountingItems }: SummaryBarProps) {
  const systemTotal = systemItems.reduce((s, i) => s + i.baseAmount, 0);
  const systemVat = systemItems.reduce((s, i) => s + i.vatAmount, 0);
  const accountingTotal = accountingItems.reduce((s, i) => s + i.baseAmount, 0);
  const accountingVat = accountingItems.reduce((s, i) => s + i.vatAmount, 0);

  const matched = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed)
  ).length;
  const systemOnly = pairs.filter((p) => p.status === "system-only").length;
  const accountingOnly = pairs.filter((p) => p.status === "accounting-only").length;
  const aiPending = pairs.filter((p) => p.status === "ai" && p.userConfirmed === undefined).length;

  const totalDiff = Math.abs(systemTotal - accountingTotal);
  const vatDiff = Math.abs(systemVat - accountingVat);
  const isBalanced = totalDiff < 0.01 && vatDiff < 0.01;

  return (
    <div className="space-y-3">
      {/* Totals comparison */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
        <Card className="border-primary/30">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">ระบบเว็บ — {systemItems.length} รายการ</p>
            <p className="text-lg font-bold text-foreground">{formatAmt(systemTotal)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">VAT: {formatAmt(systemVat)}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-center gap-1 py-2">
          {accountingItems.length > 0 ? (
            <>
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  isBalanced ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                )}
              >
                {isBalanced ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
              </div>
              {!isBalanced && (
                <span className="text-[10px] text-amber-600 font-medium text-center leading-tight">
                  ต่าง<br />{formatAmt(totalDiff)}
                </span>
              )}
            </>
          ) : (
            <MinusCircle className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>

        <Card className={cn(
          accountingItems.length === 0 ? "opacity-40" : "",
          "border-muted"
        )}>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">รายงานบัญชี — {accountingItems.length} รายการ</p>
            <p className="text-lg font-bold text-foreground">{formatAmt(accountingTotal)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">VAT: {formatAmt(accountingVat)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Match stats */}
      {accountingItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-3 w-3" />
            {matched} รายการตรงกัน
          </Badge>
          {aiPending > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <Zap className="h-3 w-3" />
              {aiPending} AI รอยืนยัน
            </Badge>
          )}
          {systemOnly > 0 && (
            <Badge variant="outline" className="gap-1 text-slate-500 border-slate-200 dark:border-slate-700">
              <MinusCircle className="h-3 w-3" />
              {systemOnly} เฉพาะในระบบ
            </Badge>
          )}
          {accountingOnly > 0 && (
            <Badge variant="outline" className="gap-1 text-red-600 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <AlertCircle className="h-3 w-3" />
              {accountingOnly} เฉพาะในรายงาน
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ReconcileView
// ---------------------------------------------------------------------------

export function ReconcileView({
  companyCode,
  year,
  month,
  type,
  systemExpenses,
  systemIncomes,
  siblingCompanies,
  selectedCompanyCodes,
}: ReconcileViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [accountingItems, setAccountingItems] = useState<AccountingRow[]>([]);
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedAccountingIndex, setSelectedAccountingIndex] = useState<number | null>(null);
  const [vatOnly, setVatOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const hasSiblings = !!siblingCompanies && siblingCompanies.length > 1;

  const allSystemItems = type === "expense" ? systemExpenses : systemIncomes;

  // Filter system items by VAT toggle and search query
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

  const buildParams = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    params.set("month", overrides.month ?? String(month));
    params.set("year", overrides.year ?? String(year));
    params.set("type", overrides.type ?? type);
    const companiesVal = overrides.companies !== undefined ? overrides.companies : (selectedCompanyCodes ? selectedCompanyCodes.join(",") : undefined);
    if (companiesVal) params.set("companies", companiesVal);
    return params;
  };

  const handleDateChange = (field: "month" | "year" | "type", value: string) => {
    const params = buildParams({ [field]: value });
    startTransition(() => {
      router.push(`/${companyCode}/reconcile?${params.toString()}`);
    });
  };

  const handleCompanyToggle = (code: string) => {
    if (!siblingCompanies) return;
    const current = selectedCompanyCodes ?? siblingCompanies.map((c) => c.code);
    let next: string[];
    if (current.includes(code)) {
      next = current.filter((c) => c !== code);
      if (next.length === 0) return;
    } else {
      next = [...current, code];
    }
    const params = buildParams({ companies: next.join(",") });
    startTransition(() => {
      router.push(`/${companyCode}/reconcile?${params.toString()}`);
    });
  };

  const handleImport = useCallback(
    (rows: AccountingRow[]) => {
      setAccountingItems(rows);
      const matched = runAutoMatch(systemItems, rows);
      setPairs(matched);
      setSelectedSystemId(null);
      setSelectedAccountingIndex(null);
    },
    [systemItems]
  );

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
      const data = await res.json();
      const suggestions = data.suggestions ?? [];

      if (suggestions.length === 0) return;

      setPairs((prev) => {
        const updated = [...prev];
        const usedAccountingInAI = new Set<number>();

        suggestions.forEach(
          (s: { systemId: string; accountingIndex: number; confidence: number; reason: string }) => {
            // Find the real accounting index from the unmatched list
            const accountingEntry = unmatchedAccounting[s.accountingIndex];
            if (!accountingEntry) return;
            const realIdx = accountingEntry._idx;
            if (usedAccountingInAI.has(realIdx)) return;

            const sysIdx = updated.findIndex(
              (p) => p.status === "system-only" && p.systemItem?.id === s.systemId
            );
            const accIdx = updated.findIndex(
              (p) => p.status === "accounting-only" && p.accountingIndex === realIdx
            );

            if (sysIdx === -1 || accIdx === -1) return;

            // Merge them into a single AI-suggested pair
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

            // Remove individual entries and add merged
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
        // Split back into system-only and accounting-only
        const result: MatchedPair[] = [];
        if (p.systemItem) {
          result.push({ id: `sys-${p.systemItem.id}`, systemItem: p.systemItem, status: "system-only" });
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

  const handleManualLink = useCallback((systemId: string, accountingIndex: number) => {
    setPairs((prev) => {
      const updated = prev.filter(
        (p) =>
          !(p.status === "system-only" && p.systemItem?.id === systemId) &&
          !(p.status === "accounting-only" && p.accountingIndex === accountingIndex)
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
  }, [systemItems, accountingItems]);

  const handleUnlink = useCallback((id: string) => {
    setPairs((prev) => {
      return prev.flatMap((p) => {
        if (p.id !== id) return [p];
        const result: MatchedPair[] = [];
        if (p.systemItem) {
          result.push({ id: `sys-${p.systemItem.id}`, systemItem: p.systemItem, status: "system-only" });
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
  };

  const filteredPairs = useMemo(() => pairs, [pairs]);

  const unmatchedSystemCount = pairs.filter((p) => p.status === "system-only").length;
  const unmatchedAccountingCount = pairs.filter((p) => p.status === "accounting-only").length;
  const canAIMatch = unmatchedSystemCount > 0 && unmatchedAccountingCount > 0;

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Month/Year selectors */}
        <Select
          value={String(month)}
          onValueChange={(v) => handleDateChange("month", v)}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => handleDateChange("year", v)}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(v) => handleDateChange("type", v)}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">ภาษีซื้อ (รายจ่าย)</SelectItem>
            <SelectItem value="income">ภาษีขาย (รายรับ)</SelectItem>
          </SelectContent>
        </Select>

        {/* Company selector (only shown when sibling companies exist) */}
        {hasSiblings && siblingCompanies && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                disabled={isPending}
              >
                <Building2 className="h-3.5 w-3.5" />
                {selectedCompanyCodes && selectedCompanyCodes.length < siblingCompanies.length
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
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleCompanyToggle(sc.code)}
                      />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-mono flex-shrink-0">
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

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* VAT-only toggle */}
        <Button
          variant={vatOnly ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => {
            setVatOnly((v) => !v);
            // Reset pairs so stale matches from old filter set don't persist
            setPairs([]);
            setAccountingItems([]);
          }}
          title="กรองเฉพาะรายการที่มี VAT (สำหรับเทียบรายงานภาษี)"
        >
          <Receipt className="h-3.5 w-3.5" />
          เฉพาะ VAT
          {vatOnly && hiddenByVatFilter > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-0.5">
              ซ่อน {hiddenByVatFilter}
            </Badge>
          )}
        </Button>

        {/* Search */}
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

        {accountingItems.length > 0 && (
          <>
            {/* AI Match button */}
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
              AI จับคู่ชื่อ
              {canAIMatch && (
                <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                  {unmatchedSystemCount + unmatchedAccountingCount}
                </Badge>
              )}
            </Button>

            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              รีเซ็ต
            </Button>
          </>
        )}

        {/* Import button */}
        <Button
          size="sm"
          className="h-9 gap-2"
          onClick={() => setShowImport(true)}
        >
          <Upload className="h-4 w-4" />
          {accountingItems.length > 0 ? "โหลดรายงานใหม่" : "นำเข้ารายงานบัญชี"}
        </Button>
      </div>

      {/* Summary bar */}
      <SummaryBar
        pairs={pairs}
        systemItems={systemItems}
        accountingItems={accountingItems}
      />

      {/* Main table */}
      <ReconcileTable
        pairs={filteredPairs}
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
        hasAccountingData={accountingItems.length > 0}
        showCompanyBadge={hasSiblings}
      />

      {/* Import dialog */}
      <ImportPanel
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        companyCode={companyCode}
        month={month}
        year={year}
        type={type}
      />
    </div>
  );
}
