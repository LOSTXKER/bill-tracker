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
}

function fmt(n?: number) {
  if (n === undefined || n === null) return "";
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

// Status badge shown in center column
function StatusBadge({ pair }: { pair: MatchedPair }) {
  if (pair.status === "exact" || pair.status === "strong") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        ตรงกัน
      </span>
    );
  }
  if (pair.status === "fuzzy") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        ใกล้เคียง
      </span>
    );
  }
  if (pair.status === "ai") {
    if (pair.userConfirmed) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          ยืนยันแล้ว
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <Zap className="h-3.5 w-3.5" />
        AI แนะนำ
        {pair.confidence !== undefined && (
          <span className="opacity-60 font-normal">{Math.round(pair.confidence * 100)}%</span>
        )}
      </span>
    );
  }
  if (pair.status === "system-only") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
        — ไม่พบ
      </span>
    );
  }
  if (pair.status === "accounting-only") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
        — ไม่พบ
      </span>
    );
  }
  return null;
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
  if (pairs.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-20 text-center text-muted-foreground text-sm">
        ยังไม่มีข้อมูลรายงานบัญชี — กดปุ่ม &ldquo;นำเข้ารายงานบัญชี&rdquo; เพื่อเริ่มต้น
      </div>
    );
  }

  // Separate by group for section headers
  const unmatchedPairs = pairs.filter(
    (p) => p.status === "system-only" || p.status === "accounting-only"
  );
  const aiPairs = pairs.filter((p) => p.status === "ai" && p.userConfirmed === undefined);
  const matchedPairs = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed === true)
  );

  const canLink =
    selectedSystemId !== null && selectedAccountingIndex !== null;

  const selectedSysItem = unmatchedPairs.find(
    (p) => p.systemItem?.id === selectedSystemId
  )?.systemItem;
  const selectedAccItem = unmatchedPairs.find(
    (p) => p.accountingIndex === selectedAccountingIndex
  )?.accountingItem;

  // Selection state for display
  const hasOneSelected = (selectedSystemId !== null) !== (selectedAccountingIndex !== null);

  return (
    <div className="space-y-1 rounded-xl border bg-card overflow-hidden">

      {/* ===== TOP ACTION BAR — always above the table ===== */}
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
              {/* Ready to link */}
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
                  onClick={() => onManualLink(selectedSystemId!, selectedAccountingIndex!)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  จับคู่รายการนี้
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* One side selected — guide user */}
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                {selectedSystemId
                  ? <>เลือกแถว <strong className="text-foreground">ระบบ</strong> แล้ว — คลิกแถวจาก <strong className="text-foreground">รายงานบัญชี</strong> อีก 1 แถวเพื่อจับคู่</>
                  : <>เลือกแถว <strong className="text-foreground">รายงานบัญชี</strong> แล้ว — คลิกแถวจาก <strong className="text-foreground">ระบบ</strong> อีก 1 แถวเพื่อจับคู่</>
                }
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

      {/* Sticky table with column headers */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          {/* ---- THEAD ---- */}
          <thead>
            <tr className="bg-muted/60 border-b">
              {/* Left: System columns */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[90px]">
                วันที่ (ระบบ)
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                ผู้ขาย / ผู้ติดต่อ
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[110px]">
                เลขที่ใบกำกับ
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground w-[90px]">
                ยอด (ระบบ)
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground w-[80px]">
                VAT
              </th>

              {/* Center divider */}
              <th className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[100px] border-x border-muted">
                สถานะ
              </th>

              {/* Right: Accounting columns */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[90px]">
                วันที่ (รายงาน)
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                ชื่อในรายงานบัญชี
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[110px]">
                เลขที่ (รายงาน)
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground w-[90px]">
                ยอด (รายงาน)
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground w-[80px]">
                VAT
              </th>

              {/* Actions col */}
              <th className="px-2 py-2.5 w-[60px]" />
            </tr>
          </thead>

          <tbody className="divide-y divide-border">

            {/* ===== SECTION: AI Suggestions ===== */}
            {aiPairs.length > 0 && (
              <>
                <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                  <td
                    colSpan={12}
                    className="px-3 py-1.5 border-y border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <Zap className="h-3.5 w-3.5" />
                      AI แนะนำ — รอการยืนยัน ({aiPairs.length} รายการ)
                    </div>
                  </td>
                </tr>
                {aiPairs.map((pair) => {
                  const amtDiff =
                    pair.systemItem && pair.accountingItem
                      ? Math.abs(pair.systemItem.baseAmount - pair.accountingItem.baseAmount)
                      : 0;
                  return (
                    <tr
                      key={pair.id}
                      className="bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 transition-colors"
                    >
                      {/* System side */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(pair.systemItem?.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {pair.systemItem?.vendorName || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]">
                        {pair.systemItem?.invoiceNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-mono font-medium">
                        {fmt(pair.systemItem?.baseAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                        {fmt(pair.systemItem?.vatAmount)}
                      </td>

                      {/* Status center */}
                      <td className="px-2 py-2.5 border-x border-muted text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <StatusBadge pair={pair} />
                          {pair.aiReason && (
                            <p className="text-[10px] text-muted-foreground leading-tight text-center max-w-[90px] truncate">
                              {pair.aiReason}
                            </p>
                          )}
                          {amtDiff > 0.01 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 h-4 text-orange-600 border-orange-300"
                            >
                              ต่าง {fmt(amtDiff)}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Accounting side */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(pair.accountingItem?.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {pair.accountingItem?.vendorName || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]">
                        {pair.accountingItem?.invoiceNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-mono font-medium">
                        {fmt(pair.accountingItem?.baseAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                        {fmt(pair.accountingItem?.vatAmount)}
                      </td>

                      {/* AI confirm/reject actions */}
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="ไม่ใช่"
                            onClick={() => onRejectAI(pair.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="ใช่ ยืนยัน"
                            onClick={() => onConfirmAI(pair.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* ===== SECTION: Unmatched ===== */}
            {unmatchedPairs.length > 0 && (
              <>
                <tr className="bg-muted/30">
                  <td colSpan={12} className="px-3 py-1.5 border-y border-muted">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      ยังไม่ตรงกัน ({unmatchedPairs.length} รายการ)
                      <span className="font-normal">— คลิกเลือก 1 แถวจากระบบ และ 1 แถวจากรายงาน เพื่อจับคู่</span>
                    </div>
                  </td>
                </tr>
                {unmatchedPairs.map((pair) => {
                  const isSysRow = pair.status === "system-only";
                  const isAccRow = pair.status === "accounting-only";
                  const isSysSelected = isSysRow && pair.systemItem?.id === selectedSystemId;
                  const isAccSelected =
                    isAccRow && pair.accountingIndex === selectedAccountingIndex;
                  const isSelected = isSysSelected || isAccSelected;

                  return (
                    <tr
                      key={pair.id}
                      className={cn(
                        "transition-colors",
                        isSelected
                          ? isSysSelected
                            ? "bg-primary/8 ring-1 ring-inset ring-primary/30"
                            : "bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400/40"
                          : "hover:bg-muted/30",
                        isSysRow ? "cursor-pointer" : "",
                        isAccRow ? "cursor-pointer" : ""
                      )}
                      onClick={() => {
                        if (isSysRow && pair.systemItem) {
                          onSelectSystem(
                            pair.systemItem.id === selectedSystemId ? null : pair.systemItem.id
                          );
                        } else if (isAccRow && pair.accountingIndex !== undefined) {
                          onSelectAccounting(
                            pair.accountingIndex === selectedAccountingIndex
                              ? null
                              : pair.accountingIndex
                          );
                        }
                      }}
                    >
                      {/* System side */}
                      <td className={cn("px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap", isAccRow && "opacity-30")}>
                        {isSysRow ? fmtDate(pair.systemItem?.date) : ""}
                      </td>
                      <td className={cn("px-3 py-2.5", isAccRow && "opacity-30")}>
                        {isSysRow ? (
                          <p className="text-sm font-medium truncate max-w-[180px]">
                            {pair.systemItem?.vendorName || "—"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">ไม่พบในระบบ</p>
                        )}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]", isAccRow && "opacity-30")}>
                        {isSysRow ? (pair.systemItem?.invoiceNumber || "—") : ""}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right text-sm font-mono font-medium", isAccRow && "opacity-30")}>
                        {isSysRow ? fmt(pair.systemItem?.baseAmount) : ""}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400", isAccRow && "opacity-30")}>
                        {isSysRow ? fmt(pair.systemItem?.vatAmount) : ""}
                      </td>

                      {/* Status center */}
                      <td className="px-2 py-2.5 border-x border-muted text-center">
                        <StatusBadge pair={pair} />
                      </td>

                      {/* Accounting side */}
                      <td className={cn("px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap", isSysRow && "opacity-30")}>
                        {isAccRow ? fmtDate(pair.accountingItem?.date) : ""}
                      </td>
                      <td className={cn("px-3 py-2.5", isSysRow && "opacity-30")}>
                        {isAccRow ? (
                          <p className="text-sm font-medium truncate max-w-[180px]">
                            {pair.accountingItem?.vendorName || "—"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">ไม่พบในรายงาน</p>
                        )}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]", isSysRow && "opacity-30")}>
                        {isAccRow ? (pair.accountingItem?.invoiceNumber || "—") : ""}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right text-sm font-mono font-medium", isSysRow && "opacity-30")}>
                        {isAccRow ? fmt(pair.accountingItem?.baseAmount) : ""}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400", isSysRow && "opacity-30")}>
                        {isAccRow ? fmt(pair.accountingItem?.vatAmount) : ""}
                      </td>

                      {/* Selection indicator */}
                      <td className="px-2 py-2.5 text-center">
                        {isSelected && (
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center mx-auto",
                              isSysSelected
                                ? "border-primary bg-primary/10"
                                : "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                            )}
                          >
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isSysSelected ? "bg-primary" : "bg-amber-500"
                              )}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* ===== SECTION: Matched ===== */}
            {matchedPairs.length > 0 && (
              <>
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/10">
                  <td colSpan={12} className="px-3 py-1.5 border-y border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      จับคู่แล้ว ({matchedPairs.length} รายการ)
                    </div>
                  </td>
                </tr>
                {matchedPairs.map((pair) => {
                  const amtDiff =
                    pair.systemItem && pair.accountingItem
                      ? Math.abs(pair.systemItem.baseAmount - pair.accountingItem.baseAmount)
                      : 0;
                  return (
                    <tr
                      key={pair.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* System side */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(pair.systemItem?.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {pair.systemItem?.vendorName || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]">
                        {pair.systemItem?.invoiceNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-mono font-medium">
                        {fmt(pair.systemItem?.baseAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                        {fmt(pair.systemItem?.vatAmount)}
                      </td>

                      {/* Status center */}
                      <td className="px-2 py-2.5 border-x border-muted text-center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge pair={pair} />
                          {amtDiff > 0.01 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 h-4 text-orange-600 border-orange-300"
                            >
                              ต่าง {fmt(amtDiff)}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Accounting side */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(pair.accountingItem?.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {pair.accountingItem?.vendorName || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]">
                        {pair.accountingItem?.invoiceNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-mono font-medium">
                        {fmt(pair.accountingItem?.baseAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                        {fmt(pair.accountingItem?.vatAmount)}
                      </td>

                      {/* Unlink */}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => onUnlink(pair.id)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors"
                          title="ยกเลิกการจับคู่"
                        >
                          <Unlink2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

          </tbody>

          {/* ---- TFOOT: Totals ---- */}
          {pairs.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t-2 border-border font-semibold">
                <td className="px-3 py-2.5 text-xs text-muted-foreground" colSpan={3}>
                  รวม ({pairs.filter(p => p.systemItem).length} รายการ)
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-mono">
                  {fmt(
                    pairs.reduce((s, p) => s + (p.systemItem?.baseAmount ?? 0), 0)
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                  {fmt(
                    pairs.reduce((s, p) => s + (p.systemItem?.vatAmount ?? 0), 0)
                  )}
                </td>
                <td className="border-x border-muted" />
                <td className="px-3 py-2.5 text-xs text-muted-foreground" colSpan={3}>
                  รวม ({pairs.filter(p => p.accountingItem).length} รายการ)
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-mono">
                  {fmt(
                    pairs.reduce((s, p) => s + (p.accountingItem?.baseAmount ?? 0), 0)
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                  {fmt(
                    pairs.reduce((s, p) => s + (p.accountingItem?.vatAmount ?? 0), 0)
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
