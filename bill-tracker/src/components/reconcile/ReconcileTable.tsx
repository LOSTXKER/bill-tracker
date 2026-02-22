"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Zap,
  Link2,
  Unlink2,
  Check,
  X,
  AlertTriangle,
  Upload,
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
  // New props for context
  month: number;
  year: number;
  type: "expense" | "income";
  onShowImport: () => void;
  hasAccountingData: boolean;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return iso;
  }
}

function MatchBadge({ pair }: { pair: MatchedPair }) {
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

// A compact card for a system item row (left side)
function SystemCell({
  pair,
  isSelected,
  isSelectable,
  onSelect,
}: {
  pair: MatchedPair;
  isSelected: boolean;
  isSelectable: boolean;
  onSelect: () => void;
}) {
  const item = pair.systemItem;
  const isEmpty = !item;

  if (isEmpty) {
    return (
      <div className="px-3 py-2.5 flex items-center opacity-25">
        <span className="text-xs text-muted-foreground italic">ไม่พบในระบบ</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2.5 flex flex-col gap-0.5 min-w-0",
        isSelectable && "cursor-pointer select-none",
        isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30"
      )}
      onClick={isSelectable ? onSelect : undefined}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isSelected && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
        <p className="text-sm font-medium truncate">
          {item.vendorName || item.description || "—"}
        </p>
        <span className="text-sm font-mono font-semibold ml-auto flex-shrink-0">
          {fmt(item.baseAmount)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{fmtDate(item.date)}</span>
        {item.description && item.vendorName && item.description !== item.vendorName && (
          <span className="truncate max-w-[120px]">{item.description}</span>
        )}
        {item.vatAmount > 0 && (
          <span className="ml-auto flex-shrink-0 text-blue-600 dark:text-blue-400">
            VAT {fmt(item.vatAmount)}
          </span>
        )}
      </div>
    </div>
  );
}

// A compact card for an accounting item row (right side)
function AccountingCell({
  pair,
  isSelected,
  isSelectable,
  onSelect,
}: {
  pair: MatchedPair;
  isSelected: boolean;
  isSelectable: boolean;
  onSelect: () => void;
}) {
  const item = pair.accountingItem;
  const isEmpty = !item;

  if (isEmpty) {
    return (
      <div className="px-3 py-2.5 flex items-center opacity-25">
        <span className="text-xs text-muted-foreground italic">ไม่พบในรายงาน</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2.5 flex flex-col gap-0.5 min-w-0",
        isSelectable && "cursor-pointer select-none",
        isSelected && "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400/40"
      )}
      onClick={isSelectable ? onSelect : undefined}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isSelected && (
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        )}
        <p className="text-sm font-medium truncate">{item.vendorName || "—"}</p>
        <span className="text-sm font-mono font-semibold ml-auto flex-shrink-0">
          {fmt(item.baseAmount)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{fmtDate(item.date)}</span>
        {item.vatAmount > 0 && (
          <span className="ml-auto flex-shrink-0 text-blue-600 dark:text-blue-400">
            VAT {fmt(item.vatAmount)}
          </span>
        )}
      </div>
    </div>
  );
}

// Center cell: status + actions
function CenterCell({
  pair,
  canLink,
  onConfirmAI,
  onRejectAI,
  onUnlink,
}: {
  pair: MatchedPair;
  canLink: boolean;
  onConfirmAI: (id: string) => void;
  onRejectAI: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
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
      <div className="flex flex-col items-center gap-1.5 px-1 py-2">
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
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-2">
        <MatchBadge pair={pair} />
        {amtDiff > 0.01 && (
          <Badge variant="outline" className="text-[10px] px-1 h-4 text-orange-600 border-orange-300">
            ต่าง {fmt(amtDiff)}
          </Badge>
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
      <div className="flex items-center justify-center px-1 py-2">
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
    <div className="flex items-center justify-center px-1 py-2">
      <span className="text-muted-foreground/30 text-lg">—</span>
    </div>
  );
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
  month,
  year,
  type,
  onShowImport,
  hasAccountingData,
}: ReconcileTableProps) {
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
  const matchedPairs = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed === true)
  );

  // Order: AI suggestions first, then unmatched, then matched
  const orderedPairs = [...aiPairs, ...unmatchedPairs, ...matchedPairs];

  const typeLabel = type === "expense" ? "ภาษีซื้อ" : "ภาษีขาย";
  const monthLabel = MONTHS[month - 1];
  const yearLabel = year + 543;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Sticky selection action bar */}
      {(canLink || hasOneSelected) && (
        <div
          className={cn(
            "sticky top-0 z-20 border-b px-4 py-2.5 flex items-center gap-3",
            canLink
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/80 backdrop-blur-sm"
          )}
        >
          {canLink && selectedSysItem && selectedAccItem ? (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-2 w-2 rounded-full bg-primary-foreground/70 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{selectedSysItem.vendorName}</span>
                <span className="text-sm font-mono opacity-70 flex-shrink-0">
                  {fmt(selectedSysItem.baseAmount)}
                </span>
              </div>
              <Link2 className="h-4 w-4 flex-shrink-0 opacity-80" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-2 w-2 rounded-full bg-primary-foreground/70 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{selectedAccItem.vendorName}</span>
                <span className="text-sm font-mono opacity-70 flex-shrink-0">
                  {fmt(selectedAccItem.baseAmount)}
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => {
                    onSelectSystem(null);
                    onSelectAccounting(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  onClick={() =>
                    onManualLink(selectedSystemId!, selectedAccountingIndex!)
                  }
                >
                  <Link2 className="h-3.5 w-3.5" />
                  จับคู่รายการนี้
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                {selectedSystemId ? (
                  <>
                    เลือกแถว <strong className="text-foreground">ระบบ</strong> แล้ว —
                    คลิกแถวจาก <strong className="text-foreground">รายงานบัญชี</strong> เพื่อจับคู่
                  </>
                ) : (
                  <>
                    เลือกแถว <strong className="text-foreground">รายงานบัญชี</strong> แล้ว —
                    คลิกแถวจาก <strong className="text-foreground">ระบบ</strong> เพื่อจับคู่
                  </>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => {
                  onSelectSystem(null);
                  onSelectAccounting(null);
                }}
              >
                ล้างการเลือก
              </Button>
            </>
          )}
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_88px_1fr] border-b bg-muted/50">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
          ระบบเว็บ ({pairs.filter((p) => p.systemItem).length} รายการ)
        </div>
        <div className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground border-x border-border">
          สถานะ
        </div>
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
          <span>รายงานบัญชี ({pairs.filter((p) => p.accountingItem).length} รายการ)</span>
          {hasAccountingData && (
            <button
              onClick={onShowImport}
              className="text-[10px] text-primary underline-offset-2 hover:underline"
            >
              โหลดใหม่
            </button>
          )}
        </div>
      </div>

      {/* No accounting data: empty state in right panel */}
      {!hasAccountingData ? (
        <div className="grid grid-cols-[1fr_88px_1fr]">
          {/* Left: system items list (non-interactive) */}
          <div className="border-r border-border overflow-y-auto max-h-[calc(100vh-340px)] divide-y divide-border">
            {pairs.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                ไม่มีรายการในเดือนนี้
              </div>
            ) : (
              pairs.map((pair) => (
                <div key={pair.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {pair.systemItem?.vendorName || pair.systemItem?.description || "—"}
                    </p>
                    <span className="text-sm font-mono font-semibold ml-auto flex-shrink-0">
                      {fmt(pair.systemItem?.baseAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{fmtDate(pair.systemItem?.date)}</span>
                    {(pair.systemItem?.vatAmount ?? 0) > 0 && (
                      <span className="ml-auto text-blue-600 dark:text-blue-400">
                        VAT {fmt(pair.systemItem?.vatAmount)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Center divider */}
          <div className="border-r border-border" />

          {/* Right: upload empty state */}
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[300px]">
            <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              นำเข้ารายงาน{typeLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              เดือน{monthLabel} {yearLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
              อัปโหลด Excel, CSV หรือ PDF เพื่อเริ่มเปรียบเทียบ
            </p>
            <Button onClick={onShowImport} className="mt-5 gap-2">
              <Upload className="h-4 w-4" />
              อัปโหลดไฟล์
            </Button>
          </div>
        </div>
      ) : (
        /* Main split-view table */
        <div
          className="divide-y divide-border overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 340px)" }}
        >
          {/* AI Suggestions section */}
          {aiPairs.length > 0 && (
            <>
              <div className="grid grid-cols-[1fr_88px_1fr] bg-amber-50/60 dark:bg-amber-950/20">
                <div
                  className="col-span-3 px-3 py-1.5 border-y border-amber-200 dark:border-amber-800"
                >
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
                    <SystemCell
                      pair={pair}
                      isSelected={false}
                      isSelectable={false}
                      onSelect={() => {}}
                    />
                  </div>
                  <div className="border-r border-border">
                    <CenterCell
                      pair={pair}
                      canLink={false}
                      onConfirmAI={onConfirmAI}
                      onRejectAI={onRejectAI}
                      onUnlink={onUnlink}
                    />
                  </div>
                  <AccountingCell
                    pair={pair}
                    isSelected={false}
                    isSelectable={false}
                    onSelect={() => {}}
                  />
                </div>
              ))}
            </>
          )}

          {/* Unmatched section */}
          {unmatchedPairs.length > 0 && (
            <>
              <div className="grid grid-cols-[1fr_88px_1fr] bg-muted/30">
                <div className="col-span-3 px-3 py-1.5 border-y border-muted">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                    ยังไม่ตรงกัน ({unmatchedPairs.length} รายการ)
                    <span className="font-normal">
                      — คลิกเลือก 1 แถวจากระบบ และ 1 แถวจากรายงานเพื่อจับคู่
                    </span>
                  </div>
                </div>
              </div>
              {unmatchedPairs.map((pair) => {
                const isSysRow = pair.status === "system-only";
                const isAccRow = pair.status === "accounting-only";
                const isSysSelected =
                  isSysRow && pair.systemItem?.id === selectedSystemId;
                const isAccSelected =
                  isAccRow && pair.accountingIndex === selectedAccountingIndex;

                return (
                  <div
                    key={pair.id}
                    className="grid grid-cols-[1fr_88px_1fr] hover:bg-muted/20 transition-colors"
                  >
                    <div
                      className={cn(
                        "border-r border-border",
                        isSysSelected && "bg-primary/5"
                      )}
                    >
                      <SystemCell
                        pair={pair}
                        isSelected={isSysSelected}
                        isSelectable={isSysRow}
                        onSelect={() => {
                          if (!isSysRow || !pair.systemItem) return;
                          onSelectSystem(
                            pair.systemItem.id === selectedSystemId
                              ? null
                              : pair.systemItem.id
                          );
                        }}
                      />
                    </div>
                    <div className="border-r border-border">
                      <CenterCell
                        pair={pair}
                        canLink={
                          isSysRow
                            ? isSysSelected && selectedAccountingIndex !== null
                            : isAccSelected && selectedSystemId !== null
                        }
                        onConfirmAI={onConfirmAI}
                        onRejectAI={onRejectAI}
                        onUnlink={onUnlink}
                      />
                    </div>
                    <div className={cn(isAccSelected && "bg-amber-50/60 dark:bg-amber-950/20")}>
                      <AccountingCell
                        pair={pair}
                        isSelected={isAccSelected}
                        isSelectable={isAccRow}
                        onSelect={() => {
                          if (!isAccRow || pair.accountingIndex === undefined) return;
                          onSelectAccounting(
                            pair.accountingIndex === selectedAccountingIndex
                              ? null
                              : pair.accountingIndex
                          );
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Matched section */}
          {matchedPairs.length > 0 && (
            <>
              <div className="grid grid-cols-[1fr_88px_1fr] bg-emerald-50/30 dark:bg-emerald-950/10">
                <div className="col-span-3 px-3 py-1.5 border-y border-emerald-200/60 dark:border-emerald-800/40">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    จับคู่แล้ว ({matchedPairs.length} รายการ)
                  </div>
                </div>
              </div>
              {matchedPairs.map((pair) => (
                <div
                  key={pair.id}
                  className="grid grid-cols-[1fr_88px_1fr] hover:bg-muted/20 transition-colors"
                >
                  <div className="border-r border-border">
                    <SystemCell
                      pair={pair}
                      isSelected={false}
                      isSelectable={false}
                      onSelect={() => {}}
                    />
                  </div>
                  <div className="border-r border-border">
                    <CenterCell
                      pair={pair}
                      canLink={false}
                      onConfirmAI={onConfirmAI}
                      onRejectAI={onRejectAI}
                      onUnlink={onUnlink}
                    />
                  </div>
                  <AccountingCell
                    pair={pair}
                    isSelected={false}
                    isSelectable={false}
                    onSelect={() => {}}
                  />
                </div>
              ))}
            </>
          )}

          {/* Totals footer */}
          {orderedPairs.length > 0 && (
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
          )}
        </div>
      )}
    </div>
  );
}
