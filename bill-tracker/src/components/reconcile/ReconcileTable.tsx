"use client";

import { useState, useMemo } from "react";
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
  Building2,
  Eye,
  Ban,
  Undo2,
  ChevronDown,
  ChevronRight,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionPreviewSheet } from "@/components/transactions/TransactionPreviewSheet";
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
  companyCode?: string;
  isPayOnBehalf?: boolean;
  payOnBehalfFrom?: string;
  payOnBehalfTo?: string;
  paidByUser?: boolean;
  fromMonth?: number;
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
  month: number;
  year: number;
  type: "expense" | "income" | "pp36";
  onShowImport: () => void;
  hasAccountingData: boolean;
  showCompanyBadge?: boolean;
  companyCode: string;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

type MonthRange = 0 | 1 | 3 | 6;

const RANGE_PRESETS: { value: MonthRange; label: string }[] = [
  { value: 0, label: "เดือนนี้" },
  { value: 1, label: "+1 เดือน" },
  { value: 3, label: "+3 เดือน" },
  { value: 6, label: "+6 เดือน" },
];

function isWithinMonthRange(fromMonth: number, currentMonth: number, range: MonthRange): boolean {
  if (range === 0) return false;
  if (range >= 6) return true;
  for (let i = 1; i <= range; i++) {
    let m = currentMonth - i;
    if (m <= 0) m += 12;
    if (fromMonth === m) return true;
  }
  return false;
}

const SYS_GRID = "grid grid-cols-[28px_58px_1fr_88px_72px]";
const ACC_GRID = "grid grid-cols-[58px_1fr_88px_72px]";

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
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-1.5">
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

function SystemRow({
  item,
  isSelected,
  isSelectable,
  onSelect,
  showCompanyBadge,
  onPreview,
}: {
  item?: SystemItem;
  isSelected: boolean;
  isSelectable: boolean;
  onSelect: () => void;
  showCompanyBadge?: boolean;
  onPreview?: () => void;
}) {
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

function AccountingRow_({
  item,
  isSelected,
  isSelectable,
  onSelect,
  onSkip,
  isSkipped,
}: {
  item?: AccountingRow;
  isSelected: boolean;
  isSelectable: boolean;
  onSelect: () => void;
  onSkip?: () => void;
  isSkipped?: boolean;
}) {
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
  showCompanyBadge,
  companyCode,
}: ReconcileTableProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [monthRange, setMonthRange] = useState<MonthRange>(0);
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

  const matchedPairs = pairs.filter(
    (p) =>
      p.status === "exact" ||
      p.status === "strong" ||
      p.status === "fuzzy" ||
      (p.status === "ai" && p.userConfirmed === true)
  );

  const orderedPairs = [...aiPairs, ...unmatchedPairs, ...matchedPairs];

  const typeLabel = type === "expense" ? "ภาษีซื้อ" : type === "income" ? "ภาษีขาย" : "ภพ.36";
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

      {/* Column headers with table sub-headers */}
      <div className="border-b bg-muted/50">
        <div className="grid grid-cols-[1fr_88px_1fr]">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-r border-border">
            ระบบเว็บ ({pairs.filter((p) => p.systemItem).length} รายการ)
          </div>
          <div className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground border-r border-border">
            สถานะ
          </div>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center justify-between">
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
        <div className="grid grid-cols-[1fr_88px_1fr] border-t border-border/50">
          <div className={cn(SYS_GRID, "px-2 py-1 text-[10px] text-muted-foreground/60 border-r border-border")}>
            <div />
            <div>วันที่</div>
            <div>ชื่อผู้ขาย</div>
            <div className="text-right">ยอดเงิน</div>
            <div className="text-right">VAT</div>
          </div>
          <div className="border-r border-border" />
          <div className={cn(ACC_GRID, "px-2 py-1 text-[10px] text-muted-foreground/60")}>
            <div>วันที่</div>
            <div>ชื่อผู้ขาย</div>
            <div className="text-right">ยอดเงิน</div>
            <div className="text-right">VAT</div>
          </div>
        </div>
      </div>

      {/* No accounting data: empty state */}
      {!hasAccountingData ? (
        <div className="grid grid-cols-[1fr_88px_1fr]">
          <div className="border-r border-border overflow-y-auto max-h-[calc(100vh-380px)] divide-y divide-border/50">
            {pairs.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                ไม่มีรายการในเดือนนี้
              </div>
            ) : (
              pairs.map((pair) => (
                <SystemRow
                  key={pair.id}
                  item={pair.systemItem}
                  isSelected={false}
                  isSelectable={false}
                  onSelect={() => {}}
                  showCompanyBadge={showCompanyBadge}
                />
              ))
            )}
          </div>
          <div className="border-r border-border" />
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
        <div
          className="divide-y divide-border/50 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 380px)" }}
        >
          {/* AI Suggestions */}
          {aiPairs.length > 0 && (
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
                      onPreview={pair.systemItem ? () => handlePreview(pair.systemItem!.id) : undefined}
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
                  <AccountingRow_
                    item={pair.accountingItem}
                    isSelected={false}
                    isSelectable={false}
                    onSelect={() => {}}
                  />
                </div>
              ))}
            </>
          )}

          {/* Unmatched section */}
          {(allUnmatchedSystem.length > 0 || unmatchedAccounting.length > 0) && (
            <>
              <div className="bg-muted/30">
                <div className="px-3 py-1.5 border-y border-muted">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                    ยังไม่ตรงกัน (ระบบ {unmatchedSystem.length} | รายงาน {unmatchedAccounting.length})
                    <span className="font-normal">
                      — คลิกเลือก 1 แถวจากระบบ และ 1 แถวจากรายงานเพื่อจับคู่
                    </span>
                  </div>
                  {spilloverSystem.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {RANGE_PRESETS.map((preset) => {
                        const count = presetCounts.get(preset.value) ?? 0;
                        if (preset.value > 0 && count === 0) return null;
                        const isActive = monthRange === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setMonthRange(preset.value)}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                              isActive
                                ? "bg-sky-100 dark:bg-sky-900/40 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300 font-medium"
                                : "border-border text-muted-foreground hover:border-sky-300 hover:text-sky-600 dark:hover:text-sky-400"
                            )}
                          >
                            {preset.label}
                            {preset.value > 0 && (
                              <span className="ml-1 opacity-60">({count})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {Array.from({ length: maxUnmatched }, (_, i) => {
                const sysPair = unmatchedSystem[i] ?? null;
                const accPair = unmatchedAccounting[i] ?? null;
                const isSysSelected = sysPair?.systemItem?.id === selectedSystemId && !!selectedSystemId;
                const isAccSelected = accPair?.accountingIndex === selectedAccountingIndex && selectedAccountingIndex !== null;

                return (
                  <div
                    key={`unmatched-${i}`}
                    className="grid grid-cols-[1fr_88px_1fr] transition-colors"
                  >
                    <div
                      className={cn(
                        "border-r border-border",
                        isSysSelected && "bg-primary/5"
                      )}
                    >
                      <SystemRow
                        item={sysPair?.systemItem}
                        isSelected={isSysSelected}
                        isSelectable={!!sysPair}
                        onSelect={() => {
                          if (!sysPair?.systemItem) return;
                          onSelectSystem(
                            sysPair.systemItem.id === selectedSystemId
                              ? null
                              : sysPair.systemItem.id
                          );
                        }}
                        showCompanyBadge={showCompanyBadge}
                        onPreview={sysPair?.systemItem ? () => handlePreview(sysPair.systemItem!.id) : undefined}
                      />
                    </div>
                    <div className="border-r border-border">
                      <div className="flex items-center justify-center px-1 py-1.5">
                        {isSysSelected && isAccSelected ? (
                          <span className="text-[10px] text-primary font-medium text-center leading-tight">
                            จับคู่
                          </span>
                        ) : isSysSelected || isAccSelected ? (
                          <span className="text-[10px] text-primary font-medium text-center leading-tight">
                            เลือก<br />อีกฝั่ง
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-lg">—</span>
                        )}
                      </div>
                    </div>
                    <div className={cn(isAccSelected && "bg-amber-50/60 dark:bg-amber-950/20")}>
                      <AccountingRow_
                        item={accPair?.accountingItem}
                        isSelected={isAccSelected}
                        isSelectable={!!accPair}
                        onSelect={() => {
                          if (accPair?.accountingIndex === undefined) return;
                          onSelectAccounting(
                            accPair.accountingIndex === selectedAccountingIndex
                              ? null
                              : accPair.accountingIndex
                          );
                        }}
                        onSkip={accPair?.accountingIndex !== undefined ? () => toggleSkip(accPair.accountingIndex!) : undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Skipped accounting section */}
          {skippedAccountingPairs.length > 0 && (
            <>
              <div className="bg-muted/20">
                <div className="px-3 py-1.5 border-y border-muted/60">
                  <button
                    type="button"
                    onClick={() => setShowSkipped(!showSkipped)}
                    className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    {showSkipped ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <EyeOff className="h-3.5 w-3.5" />
                    ข้ามแล้ว ({skippedAccountingPairs.length} รายการ)
                  </button>
                </div>
              </div>
              {showSkipped && skippedAccountingPairs.map((pair) => (
                <div
                  key={pair.id}
                  className="grid grid-cols-[1fr_88px_1fr] opacity-40 hover:opacity-60 transition-opacity"
                >
                  <div className="border-r border-border">
                    <div className={cn(SYS_GRID, "items-center px-2 py-1.5 h-8")}>
                      <div /><div /><div /><div /><div />
                    </div>
                  </div>
                  <div className="border-r border-border" />
                  <AccountingRow_
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
          )}

          {/* Matched section */}
          {matchedPairs.length > 0 && (
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
                <div
                  key={pair.id}
                  className="grid grid-cols-[1fr_88px_1fr] hover:bg-muted/20 transition-colors"
                >
                  <div className="border-r border-border">
                    <SystemRow
                      item={pair.systemItem}
                      isSelected={false}
                      isSelectable={false}
                      onSelect={() => {}}
                      showCompanyBadge={showCompanyBadge}
                      onPreview={pair.systemItem ? () => handlePreview(pair.systemItem!.id) : undefined}
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
                  <AccountingRow_
                    item={pair.accountingItem}
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

      <TransactionPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        transactionId={previewId}
        transactionType={type === "pp36" ? "expense" : type}
        companyCode={companyCode}
      />
    </div>
  );
}
