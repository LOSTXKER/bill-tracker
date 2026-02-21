"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Link2, Unlink2, Check, X, AlertTriangle } from "lucide-react";
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
  | "exact"
  | "strong"
  | "fuzzy"
  | "ai"
  | "system-only"
  | "accounting-only";

export interface MatchedPair {
  id: string;
  systemItem?: SystemItem;
  accountingItem?: AccountingRow;
  accountingIndex?: number;
  status: MatchStatus;
  confidence?: number;
  aiReason?: string;
  userConfirmed?: boolean;
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

function formatAmt(n?: number) {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// ItemCard — clickable card for unmatched items
// ---------------------------------------------------------------------------
function ItemCard({
  date,
  vendorName,
  invoiceNumber,
  baseAmount,
  vatAmount,
  selected,
  onClick,
  side,
}: {
  date?: string;
  vendorName?: string;
  invoiceNumber?: string;
  baseAmount?: number;
  vatAmount?: number;
  selected: boolean;
  onClick: () => void;
  side: "system" | "accounting";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-150 focus:outline-none",
        selected
          ? side === "system"
            ? "border-primary bg-primary/8 ring-2 ring-primary/30 shadow-sm"
            : "border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-400/30 shadow-sm"
          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate leading-tight">
            {vendorName || "—"}
          </p>
          {invoiceNumber && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{invoiceNumber}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold font-mono">{formatAmt(baseAmount)}</p>
          {(vatAmount ?? 0) > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">+{formatAmt(vatAmount)}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{formatDate(date)}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// MatchedRow — row in the matched section
// ---------------------------------------------------------------------------
function MatchedRow({
  pair,
  onUnlink,
  onConfirmAI,
  onRejectAI,
}: {
  pair: MatchedPair;
  onUnlink: (id: string) => void;
  onConfirmAI: (id: string) => void;
  onRejectAI: (id: string) => void;
}) {
  const isAIPending = pair.status === "ai" && pair.userConfirmed === undefined;
  const amtDiff =
    pair.systemItem && pair.accountingItem
      ? Math.abs(pair.systemItem.baseAmount - pair.accountingItem.baseAmount)
      : 0;
  const hasDiff = amtDiff > 0.01;

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        isAIPending
          ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
          : hasDiff
          ? "border-orange-200 dark:border-orange-800"
          : "border-border bg-card"
      )}
    >
      {/* AI pending banner */}
      {isAIPending && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-100/70 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5" />
            <span className="font-medium">AI แนะนำ</span>
            {pair.confidence !== undefined && (
              <span className="opacity-70">({Math.round(pair.confidence * 100)}% มั่นใจ)</span>
            )}
            {pair.aiReason && (
              <span className="opacity-70 hidden sm:inline">— {pair.aiReason}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => onRejectAI(pair.id)}
            >
              <X className="h-3 w-3" />
              ไม่ใช่
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onConfirmAI(pair.id)}
            >
              <Check className="h-3 w-3" />
              ใช่
            </Button>
          </div>
        </div>
      )}

      {/* Pair content */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-0">
        {/* System side */}
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">{formatDate(pair.systemItem?.date)} · ระบบ</p>
          <p className="text-sm font-medium truncate mt-0.5">{pair.systemItem?.vendorName || "—"}</p>
          {pair.systemItem?.invoiceNumber && (
            <p className="text-xs text-muted-foreground truncate">{pair.systemItem.invoiceNumber}</p>
          )}
          <p className="text-sm font-semibold font-mono mt-1">{formatAmt(pair.systemItem?.baseAmount)}</p>
        </div>

        {/* Center connector */}
        <div className="flex flex-col items-center justify-center px-2 py-2 gap-1">
          <div className="h-px w-6 bg-muted-foreground/20" />
          {!isAIPending && (
            <div className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center",
              pair.status === "exact" || pair.status === "strong"
                ? "bg-emerald-100 dark:bg-emerald-900/40"
                : "bg-blue-100 dark:bg-blue-900/40"
            )}>
              <CheckCircle2 className={cn(
                "h-3 w-3",
                pair.status === "exact" || pair.status === "strong"
                  ? "text-emerald-600"
                  : "text-blue-600"
              )} />
            </div>
          )}
          {hasDiff && (
            <Badge variant="outline" className="text-[9px] px-1 h-3.5 text-orange-600 border-orange-300 whitespace-nowrap">
              ต่าง {formatAmt(amtDiff)}
            </Badge>
          )}
          <div className="h-px w-6 bg-muted-foreground/20" />
        </div>

        {/* Accounting side */}
        <div className="px-3 py-2 border-l border-dashed border-muted">
          <p className="text-xs text-muted-foreground">{formatDate(pair.accountingItem?.date)} · รายงาน</p>
          <p className="text-sm font-medium truncate mt-0.5">{pair.accountingItem?.vendorName || "—"}</p>
          {pair.accountingItem?.invoiceNumber && (
            <p className="text-xs text-muted-foreground truncate">{pair.accountingItem.invoiceNumber}</p>
          )}
          <p className="text-sm font-semibold font-mono mt-1">{formatAmt(pair.accountingItem?.baseAmount)}</p>
        </div>
      </div>

      {/* Unlink footer */}
      {!isAIPending && (
        <div className="flex justify-end px-3 py-1 border-t border-muted/50">
          <button
            onClick={() => onUnlink(pair.id)}
            className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
          >
            <Unlink2 className="h-3 w-3" />
            ยกเลิกการจับคู่
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ReconcileTable
// ---------------------------------------------------------------------------
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
  const unmatchedSystem = pairs.filter((p) => p.status === "system-only");
  const unmatchedAccounting = pairs.filter((p) => p.status === "accounting-only");
  const matched = pairs.filter(
    (p) =>
      p.status !== "system-only" && p.status !== "accounting-only"
  );

  const selectedSystem = unmatchedSystem.find((p) => p.systemItem?.id === selectedSystemId);
  const selectedAccounting = unmatchedAccounting.find(
    (p) => p.accountingIndex === selectedAccountingIndex
  );
  const canLink = !!selectedSystem && !!selectedAccounting;

  const hasAnyUnmatched = unmatchedSystem.length > 0 || unmatchedAccounting.length > 0;

  if (pairs.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-20 text-center text-muted-foreground text-sm">
        ยังไม่มีข้อมูลรายงานบัญชี — กดปุ่ม &ldquo;นำเข้ารายงานบัญชี&rdquo; เพื่อเริ่มต้น
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== UNMATCHED SECTION ===== */}
      {hasAnyUnmatched && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-dashed border-muted-foreground/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-foreground">รายการที่ยังไม่ตรงกัน</span>
              <Badge variant="secondary" className="text-xs">
                {Math.max(unmatchedSystem.length, unmatchedAccounting.length)} รายการ
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              คลิกเลือก 1 รายการจากแต่ละฝั่ง แล้วกด "จับคู่"
            </p>
          </div>

          {/* Two-column list */}
          <div className="grid grid-cols-2 divide-x">
            {/* System unmatched */}
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                ระบบเว็บ ({unmatchedSystem.length})
              </p>
              {unmatchedSystem.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-3 text-center">
                  ✓ ทุกรายการตรงกันแล้ว
                </p>
              ) : (
                unmatchedSystem.map((p) => (
                  <ItemCard
                    key={p.id}
                    date={p.systemItem?.date}
                    vendorName={p.systemItem?.vendorName}
                    invoiceNumber={p.systemItem?.invoiceNumber}
                    baseAmount={p.systemItem?.baseAmount}
                    vatAmount={p.systemItem?.vatAmount}
                    selected={p.systemItem?.id === selectedSystemId}
                    onClick={() =>
                      onSelectSystem(
                        p.systemItem?.id === selectedSystemId ? null : (p.systemItem?.id ?? null)
                      )
                    }
                    side="system"
                  />
                ))
              )}
            </div>

            {/* Accounting unmatched */}
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                รายงานบัญชี ({unmatchedAccounting.length})
              </p>
              {unmatchedAccounting.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-3 text-center">
                  ✓ ทุกรายการตรงกันแล้ว
                </p>
              ) : (
                unmatchedAccounting.map((p) => (
                  <ItemCard
                    key={p.id}
                    date={p.accountingItem?.date}
                    vendorName={p.accountingItem?.vendorName}
                    invoiceNumber={p.accountingItem?.invoiceNumber}
                    baseAmount={p.accountingItem?.baseAmount}
                    vatAmount={p.accountingItem?.vatAmount}
                    selected={p.accountingIndex === selectedAccountingIndex}
                    onClick={() =>
                      onSelectAccounting(
                        p.accountingIndex === selectedAccountingIndex
                          ? null
                          : (p.accountingIndex ?? null)
                      )
                    }
                    side="accounting"
                  />
                ))
              )}
            </div>
          </div>

          {/* Link action bar — sticks at bottom of unmatched section */}
          <div
            className={cn(
              "px-4 py-3 border-t flex items-center justify-between gap-3 transition-colors",
              canLink
                ? "bg-primary/5 border-primary/20"
                : "bg-muted/20 border-muted-foreground/10"
            )}
          >
            {canLink ? (
              <>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {selectedSystem.systemItem?.vendorName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatAmt(selectedSystem.systemItem?.baseAmount)}
                    </p>
                  </div>
                  <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {selectedAccounting.accountingItem?.vendorName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatAmt(selectedAccounting.accountingItem?.baseAmount)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 flex-shrink-0"
                  onClick={() =>
                    onManualLink(
                      selectedSystem.systemItem!.id,
                      selectedAccounting.accountingIndex!
                    )
                  }
                >
                  <Link2 className="h-3.5 w-3.5" />
                  จับคู่รายการนี้
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {selectedSystemId && !selectedAccountingIndex
                  ? "เลือกรายการจากรายงานบัญชีด้านขวา →"
                  : selectedAccountingIndex !== null && !selectedSystemId
                  ? "← เลือกรายการจากระบบเว็บด้านซ้าย"
                  : "คลิกเลือก 1 รายการจากแต่ละฝั่งเพื่อจับคู่ด้วยตนเอง"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===== MATCHED SECTION ===== */}
      {matched.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-foreground">จับคู่แล้ว</span>
            <Badge variant="secondary" className="text-xs">{matched.length} รายการ</Badge>
          </div>
          <div className="space-y-2">
            {matched.map((pair) => (
              <MatchedRow
                key={pair.id}
                pair={pair}
                onUnlink={onUnlink}
                onConfirmAI={onConfirmAI}
                onRejectAI={onRejectAI}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
