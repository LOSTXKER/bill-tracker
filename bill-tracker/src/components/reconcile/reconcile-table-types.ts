import type { AccountingRow } from "./ImportPanel";
import type { ReconcileSessionType } from "@prisma/client";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";

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
  matchedByName?: string | null;
}

export type MonthRange = 0 | 1 | 3 | 6;

export const RANGE_PRESETS: { value: MonthRange; label: string }[] = [
  { value: 0, label: "เดือนนี้" },
  { value: 1, label: "+1 เดือน" },
  { value: 3, label: "+3 เดือน" },
  { value: 6, label: "+6 เดือน" },
];

export const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export const SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const SYS_GRID = "grid grid-cols-[28px_58px_1fr_88px_72px]";
export const ACC_GRID = "grid grid-cols-[58px_1fr_88px_72px]";

export function isWithinMonthRange(fromMonth: number, currentMonth: number, range: MonthRange): boolean {
  if (range === 0) return false;
  if (range >= 6) return true;
  for (let i = 1; i <= range; i++) {
    let m = currentMonth - i;
    if (m <= 0) m += 12;
    if (fromMonth === m) return true;
  }
  return false;
}

export function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(APP_LOCALE, { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: APP_TIMEZONE });
  } catch {
    return iso;
  }
}

export interface CenterCellProps {
  pair: MatchedPair;
  canLink: boolean;
  onConfirmAI: (id: string) => void;
  onRejectAI: (id: string) => void;
  onUnlink: (id: string) => void;
}

export interface SystemRowProps {
  item?: SystemItem;
  isSelected: boolean;
  isSelectable: boolean;
  onSelect: () => void;
  showCompanyBadge?: boolean;
  onPreview?: () => void;
}

export interface AccountingRowCellProps {
  item?: AccountingRow;
  isSelected: boolean;
  isSelectable: boolean;
  onSelect: () => void;
  onSkip?: () => void;
  isSkipped?: boolean;
}

export interface ReconcileTableProps {
  pairs: MatchedPair[];
  systemItems?: SystemItem[];
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
  type: ReconcileSessionType;
  onShowImport: () => void;
  hasAccountingData: boolean;
  showCompanyBadge?: boolean;
  companyCode: string;
  monthRange?: MonthRange;
  onMonthRangeChange?: (range: MonthRange) => void;
  onSpilloverInfo?: (info: { hasSpillover: boolean; presetCounts: Map<MonthRange, number> }) => void;
}
