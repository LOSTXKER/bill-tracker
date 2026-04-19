"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/swr-config";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  FilePlus,
  BellRing,
  CheckCheck,
  Search,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { DELIVERY_METHODS, getDeliveryMethod } from "@/lib/constants/delivery-methods";
import { PermissionGuard } from "@/components/guards/permission-guard";

// =============================================================================
// Types
// =============================================================================

type Stage = "pending-issue" | "pending-send" | "incoming-wait";

const VALID_STAGES: Stage[] = ["pending-issue", "pending-send", "incoming-wait"];

interface ExpenseItem {
  id: string;
  billDate: string;
  description: string;
  amount: number;
  whtAmount: number;
  whtRate: number;
  whtCertUrls: string[];
  whtDeliveryMethod?: string | null;
  whtDeliveryEmail?: string | null;
  whtDeliveryNotes?: string | null;
}

interface ExpenseContactGroup {
  contactId: string;
  contactName: string;
  contact: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    preferredDeliveryMethod?: string;
    deliveryEmail?: string;
    deliveryNotes?: string;
  } | null;
  deliveryMethod: string | null;
  deliveryEmail: string | null;
  deliveryNotes: string | null;
  mixedDeliveryMethods?: boolean;
  expenses: ExpenseItem[];
  totalAmount: number;
  totalWhtAmount: number;
  count: number;
}

interface IncomeItem {
  id: string;
  receiveDate: string;
  source: string | null;
  invoiceNumber: string | null;
  amount: number;
  whtAmount: number;
  whtRate: number;
  whtCertRemindCount: number | null;
  whtCertRemindedAt: string | null;
}

interface IncomeContactGroup {
  contactId: string;
  contactName: string;
  contact: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  incomes: IncomeItem[];
  totalAmount: number;
  totalWhtAmount: number;
  count: number;
}

type ExpenseStageResponse = {
  data?: {
    stage: Stage;
    kind: "expense";
    groups?: ExpenseContactGroup[];
    totalPending?: number;
    totalContacts?: number;
  };
};

type IncomeStageResponse = {
  data?: {
    stage: Stage;
    kind: "income";
    groups?: IncomeContactGroup[];
    totalPending?: number;
    totalContacts?: number;
  };
};

// =============================================================================
// Helpers / hooks
// =============================================================================

function parseStage(value: string | null): Stage {
  if (value && (VALID_STAGES as string[]).includes(value)) return value as Stage;
  return "pending-issue";
}

const STAGE_META: Record<
  Stage,
  { label: string; shortLabel: string; description: string; accent: string }
> = {
  "pending-issue": {
    label: "รอออก 50 ทวิ",
    shortLabel: "รอออก",
    description:
      "รายจ่ายที่หัก ณ ที่จ่ายแล้ว แต่ยังไม่ได้ออกหนังสือรับรอง 50 ทวิ ให้ vendor",
    accent: "amber",
  },
  "pending-send": {
    label: "รอส่ง 50 ทวิ",
    shortLabel: "รอส่ง",
    description: "หนังสือ 50 ทวิ ออกแล้ว แต่ยังไม่ได้ส่งให้ vendor",
    accent: "emerald",
  },
  "incoming-wait": {
    label: "รอใบจากลูกค้า",
    shortLabel: "รอจากลูกค้า",
    description:
      "รายรับที่ลูกค้าหัก ณ ที่จ่ายไว้ แต่ยังไม่ได้ส่งใบ 50 ทวิ มาให้",
    accent: "blue",
  },
};

const wht = (companyCode: string, stage: Stage) =>
  `/api/${companyCode}/wht-deliveries?stage=${stage}&groupBy=contact`;

function toggleSet<T>(prev: Set<T>, key: T): Set<T> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function useExpandOnFirstLoad<T extends { contactId: string }>(
  groups: T[]
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const hasAutoExpandedRef = useRef(false);
  const groupsLength = groups.length;
  const idsKey = useMemo(
    () => groups.map((g) => g.contactId).join(","),
    [groups]
  );

  useEffect(() => {
    if (hasAutoExpandedRef.current || groupsLength === 0) return;
    setExpanded(new Set(groups.map((g) => g.contactId)));
    hasAutoExpandedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsLength, idsKey]);

  return [expanded, setExpanded];
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

const AVATAR_PALETTE = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
];

function avatarClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// =============================================================================
// Page
// =============================================================================

export default function WhtDeliveriesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyCode = params.company as string;

  const stage = parseStage(searchParams.get("stage"));

  const handleStageChange = (value: string) => {
    const newStage = parseStage(value);
    router.replace(
      `/${companyCode}/wht-deliveries?stage=${newStage}`,
      { scroll: false }
    );
  };

  // ดึง count ของทุก stage แบบ parallel เพื่อโชว์ badge
  const { data: countIssue } = useSWR<ExpenseStageResponse>(
    companyCode ? wht(companyCode, "pending-issue") : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: countSend } = useSWR<ExpenseStageResponse>(
    companyCode ? wht(companyCode, "pending-send") : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: countIncoming } = useSWR<IncomeStageResponse>(
    companyCode ? wht(companyCode, "incoming-wait") : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const refreshAll = () => {
    if (!companyCode) return;
    globalMutate(wht(companyCode, "pending-issue"));
    globalMutate(wht(companyCode, "pending-send"));
    globalMutate(wht(companyCode, "incoming-wait"));
    toast.success("กำลังรีเฟรช...");
  };

  return (
    <PermissionGuard permission="expenses:read">
      <div className="space-y-6 pb-24">
        <PageHeader
          icon={FileText}
          title="ใบหัก ณ ที่จ่าย"
          description="ติดตามสถานะการออก / ส่ง / รับใบ 50 ทวิ ทุกประเภทในที่เดียว"
          actions={
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
          }
        />

        <Tabs value={stage} onValueChange={handleStageChange} className="gap-4">
          <TabsList className="h-auto p-1 bg-muted/50 w-full md:w-fit">
            <StageTab
              stage="pending-issue"
              icon={FilePlus}
              total={countIssue?.data?.totalPending}
              active={stage === "pending-issue"}
            />
            <StageTab
              stage="pending-send"
              icon={Send}
              total={countSend?.data?.totalPending}
              active={stage === "pending-send"}
            />
            <StageTab
              stage="incoming-wait"
              icon={BellRing}
              total={countIncoming?.data?.totalPending}
              active={stage === "incoming-wait"}
            />
          </TabsList>

          <TabsContent value="pending-issue" className="mt-0">
            <PendingIssueTab companyCode={companyCode} />
          </TabsContent>
          <TabsContent value="pending-send" className="mt-0">
            <PendingSendTab companyCode={companyCode} />
          </TabsContent>
          <TabsContent value="incoming-wait" className="mt-0">
            <IncomingWaitTab companyCode={companyCode} />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

// =============================================================================
// Tab trigger / shared chrome
// =============================================================================

function StageTab({
  stage,
  icon: Icon,
  total,
  active,
}: {
  stage: Stage;
  icon: React.ComponentType<{ className?: string }>;
  total: number | undefined;
  active: boolean;
}) {
  const meta = STAGE_META[stage];
  const accentRing: Record<string, string> = {
    amber: "data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300",
    emerald:
      "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300",
    blue: "data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300",
  };
  const badgeClass = (() => {
    if (total === undefined) return "bg-muted text-muted-foreground";
    if (total === 0) return "bg-muted text-muted-foreground";
    return active
      ? meta.accent === "amber"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : meta.accent === "emerald"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      : "bg-foreground/10 text-foreground";
  })();

  return (
    <TabsTrigger
      value={stage}
      className={cn(
        "gap-2 px-4 py-2 h-auto text-sm font-medium",
        accentRing[meta.accent]
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{meta.label}</span>
      <span
        className={cn(
          "inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-semibold",
          badgeClass
        )}
      >
        {total ?? "·"}
      </span>
    </TabsTrigger>
  );
}

function StageHeader({
  description,
  metrics,
  search,
  rightSlot,
}: {
  description: string;
  metrics: { label: string; value: string | number; tone?: string }[];
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {m.label}
              </span>
              <span className={cn("text-lg font-semibold tabular-nums", m.tone)}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {search && (
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder || "ค้นหา..."}
                className="pl-9 pr-9 h-9 rounded-lg"
              />
              {search.value && (
                <button
                  type="button"
                  onClick={() => search.onChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}

function VendorAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const cls = avatarClass(name);
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-semibold",
        sz,
        cls
      )}
    >
      {getInitial(name)}
    </div>
  );
}

function VendorCardShell({
  vendorName,
  contactInfo,
  countLabel,
  totalWht,
  rightExtra,
  isExpanded,
  onToggle,
  leadingSlot,
  children,
}: {
  vendorName: string;
  contactInfo?: { email?: string | null; phone?: string | null };
  countLabel: string;
  totalWht: number;
  rightExtra?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  leadingSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  // หมายเหตุ: ไม่ใช้ <button> ครอบทั้งหัวการ์ดเพราะ leadingSlot จะมี
  // Radix Checkbox (ซึ่งเป็น <button> เอง) → button-in-button hydration error
  return (
    <Card className="border-border/60 overflow-hidden p-0 gap-0">
      <div className="px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3">
        {leadingSlot && <div className="shrink-0">{leadingSlot}</div>}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-md"
        >
          <VendorAvatar name={vendorName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium truncate">{vendorName}</span>
              <Badge variant="secondary" className="text-xs">
                {countLabel}
              </Badge>
            </div>
            {(contactInfo?.email || contactInfo?.phone || rightExtra) && (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground pl-6">
                {contactInfo?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contactInfo.email}
                  </span>
                )}
                {contactInfo?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contactInfo.phone}
                  </span>
                )}
                {rightExtra}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold tabular-nums">{formatCurrency(totalWht)}</div>
            <div className="text-[11px] text-muted-foreground">ยอด WHT</div>
          </div>
        </button>
      </div>
      {isExpanded && (
        <div className="border-t border-border/60 bg-muted/20">{children}</div>
      )}
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  message,
  subMessage,
}: {
  message: string;
  subMessage: string;
}) {
  return (
    <Card className="border-border/60 border-dashed">
      <CardContent className="py-16 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/10 mb-4">
          <CheckCircle className="h-7 w-7 text-emerald-500" />
        </div>
        <h3 className="text-base font-semibold mb-1">{message}</h3>
        <p className="text-sm text-muted-foreground">{subMessage}</p>
      </CardContent>
    </Card>
  );
}

function StickyActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border-2 border-primary/20 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{count}</span>
          </div>
          <span className="text-sm font-medium hidden sm:inline">รายการที่เลือก</span>
        </div>
        <div className="h-6 w-px bg-border" />
        {children}
        <div className="h-6 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Tab: รอออก 50 ทวิ (pending-issue)
// =============================================================================

function PendingIssueTab({ companyCode }: { companyCode: string }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<ExpenseStageResponse>(
    wht(companyCode, "pending-issue"),
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups = useMemo(() => data?.data?.groups || [], [data]);
  const totalPending = data?.data?.totalPending || 0;

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useExpandOnFirstLoad(groups);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        expenses: g.expenses.filter(
          (e) =>
            g.contactName.toLowerCase().includes(q) ||
            (e.description || "").toLowerCase().includes(q)
        ),
      }))
      .filter(
        (g) => g.contactName.toLowerCase().includes(q) || g.expenses.length > 0
      );
  }, [groups, search]);

  const totalWht = groups.reduce((s, g) => s + g.totalWhtAmount, 0);

  const issueMany = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBusyIds(new Set(ids));
    const toastId = toast.loading(`กำลังออกหนังสือ ${ids.length} รายการ...`);
    let ok = 0;
    let failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/${companyCode}/document-workflow`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionType: "expense",
              transactionId: id,
              action: "issue_wht",
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json?.error || "fail");
          ok++;
        } catch {
          failed++;
        }
      })
    );
    setBusyIds(new Set());
    setSelected(new Set());
    if (failed === 0) {
      toast.success(`ออกหนังสือ 50 ทวิ สำเร็จ ${ok} รายการ`, { id: toastId });
    } else {
      toast.error(`สำเร็จ ${ok} / ล้มเหลว ${failed}`, { id: toastId });
    }
    mutate();
    globalMutate(wht(companyCode, "pending-send"));
  };

  const toggleAllInGroup = (g: ExpenseContactGroup) => {
    const ids = g.expenses.map((e) => e.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const allVisibleIds = filteredGroups.flatMap((g) => g.expenses.map((e) => e.id));
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  if (isLoading) return <ListSkeleton />;
  if (groups.length === 0) {
    return (
      <EmptyState
        message="ไม่มีรายการรอออก"
        subMessage="หนังสือ 50 ทวิ สำหรับรายจ่ายทั้งหมดถูกออกแล้ว"
      />
    );
  }

  return (
    <div className="space-y-4">
      <StageHeader
        description={STAGE_META["pending-issue"].description}
        metrics={[
          { label: "รอออก", value: totalPending },
          { label: "Vendor", value: groups.length },
          {
            label: "ยอด WHT",
            value: formatCurrency(totalWht),
            tone: "text-amber-600 dark:text-amber-400",
          },
        ]}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "ค้นหา vendor หรือรายการ...",
        }}
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (allVisibleSelected) setSelected(new Set());
              else setSelected(new Set(allVisibleIds));
            }}
            className="h-9"
          >
            {allVisibleSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
          </Button>
        }
      />

      {filteredGroups.length === 0 ? (
        <EmptyState
          message="ไม่พบรายการที่ค้นหา"
          subMessage="ลองเปลี่ยนคำค้นหาใหม่"
        />
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.contactId);
            const ids = group.expenses.map((e) => e.id);
            const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
            const someSel = ids.some((id) => selected.has(id));
            const groupBusy = ids.some((id) => busyIds.has(id));

            return (
              <VendorCardShell
                key={group.contactId}
                vendorName={group.contactName}
                contactInfo={
                  group.contact
                    ? { email: group.contact.email, phone: group.contact.phone }
                    : undefined
                }
                countLabel={`${group.count} รายการ`}
                totalWht={group.totalWhtAmount}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedGroups((prev) => toggleSet(prev, group.contactId))
                }
                leadingSlot={
                  <Checkbox
                    checked={allSel ? true : someSel ? "indeterminate" : false}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllInGroup(group);
                    }}
                  />
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[720px]">
                    <colgroup>
                      <col className="w-12" />
                      <col className="w-32" />
                      <col />
                      <col className="w-20" />
                      <col className="w-36" />
                      <col className="w-28" />
                    </colgroup>
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="p-3"></th>
                        <th className="text-left p-3 font-medium">วันที่</th>
                        <th className="text-left p-3 font-medium">รายละเอียด</th>
                        <th className="text-right p-3 font-medium">WHT %</th>
                        <th className="text-right p-3 font-medium">ยอด WHT</th>
                        <th className="text-right p-3 font-medium">
                          การกระทำ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.expenses.map((expense) => {
                        const checked = selected.has(expense.id);
                        const busy = busyIds.has(expense.id);
                        return (
                          <tr
                            key={expense.id}
                            className={cn(
                              "border-t border-border/40 hover:bg-muted/40 transition-colors",
                              checked && "bg-primary/5"
                            )}
                          >
                            <td className="p-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  setSelected((prev) =>
                                    toggleSet(prev, expense.id)
                                  )
                                }
                              />
                            </td>
                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                              {formatThaiDate(new Date(expense.billDate))}
                            </td>
                            <td className="p-3 truncate">
                              <button
                                type="button"
                                className="text-left hover:underline text-foreground truncate max-w-full"
                                title={expense.description || "-"}
                                onClick={() =>
                                  router.push(
                                    `/${companyCode}/expenses/${expense.id}`
                                  )
                                }
                              >
                                {expense.description || "-"}
                              </button>
                            </td>
                            <td className="p-3 text-right text-muted-foreground tabular-nums">
                              {expense.whtRate}%
                            </td>
                            <td className="p-3 text-right font-medium tabular-nums">
                              {formatCurrency(expense.whtAmount)}
                            </td>
                            <td className="p-3 text-right">
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                loading={busy}
                                onClick={() => issueMany([expense.id])}
                                className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              >
                                <FilePlus className="h-3.5 w-3.5 mr-1" />
                                ออก
                              </LoadingButton>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Vendor-level bulk action */}
                      <tr className="border-t border-border/40 bg-muted/30">
                        <td colSpan={6} className="p-2 text-right">
                          <LoadingButton
                            size="sm"
                            variant="ghost"
                            loading={groupBusy}
                            disabled={ids.length === 0}
                            onClick={() => issueMany(ids)}
                            className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          >
                            <FilePlus className="h-3.5 w-3.5 mr-1" />
                            ออก 50 ทวิ ทั้ง vendor นี้ ({ids.length})
                          </LoadingButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </VendorCardShell>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <StickyActionBar count={selected.size} onClear={() => setSelected(new Set())}>
          <LoadingButton
            size="sm"
            loading={busyIds.size > 0}
            onClick={() => issueMany(Array.from(selected))}
            className="h-8 bg-amber-600 hover:bg-amber-700"
          >
            <FilePlus className="h-4 w-4 mr-2" />
            ออก 50 ทวิ ที่เลือก
          </LoadingButton>
        </StickyActionBar>
      )}
    </div>
  );
}

// =============================================================================
// Tab: รอส่ง 50 ทวิ (pending-send) — bulk select + dialog
// =============================================================================

function PendingSendTab({ companyCode }: { companyCode: string }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<ExpenseStageResponse>(
    wht(companyCode, "pending-send"),
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups = useMemo(() => data?.data?.groups || [], [data]);
  const totalPending = data?.data?.totalPending || 0;
  const totalWht = groups.reduce((s, g) => s + g.totalWhtAmount, 0);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showMarkSentDialog, setShowMarkSentDialog] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useExpandOnFirstLoad(groups);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        expenses: g.expenses.filter(
          (e) =>
            g.contactName.toLowerCase().includes(q) ||
            (e.description || "").toLowerCase().includes(q)
        ),
      }))
      .filter(
        (g) => g.contactName.toLowerCase().includes(q) || g.expenses.length > 0
      );
  }, [groups, search]);

  const allVisibleIds = filteredGroups.flatMap((g) => g.expenses.map((e) => e.id));
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  const handleMarkSent = async () => {
    if (selected.size === 0) {
      toast.error("กรุณาเลือกรายการที่ต้องการส่ง");
      return;
    }
    if (!selectedDeliveryMethod) {
      toast.error("กรุณาเลือกวิธีส่ง");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/${companyCode}/wht-deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: Array.from(selected),
          deliveryMethod: selectedDeliveryMethod,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message || "อัปเดตสถานะสำเร็จ");
        setShowMarkSentDialog(false);
        setSelected(new Set());
        setSelectedDeliveryMethod("");
        setNotes("");
        mutate();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <ListSkeleton />;
  if (groups.length === 0) {
    return (
      <EmptyState
        message="ไม่มีรายการรอส่ง"
        subMessage="ใบหัก ณ ที่จ่าย ทั้งหมดถูกส่งให้ vendor แล้ว"
      />
    );
  }

  return (
    <div className="space-y-4">
      <StageHeader
        description={STAGE_META["pending-send"].description}
        metrics={[
          { label: "รอส่ง", value: totalPending },
          { label: "Vendor", value: groups.length },
          {
            label: "ยอด WHT",
            value: formatCurrency(totalWht),
            tone: "text-emerald-600 dark:text-emerald-400",
          },
          ...(selected.size > 0
            ? [
                {
                  label: "เลือกแล้ว",
                  value: selected.size,
                  tone: "text-primary",
                },
              ]
            : []),
        ]}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "ค้นหา vendor หรือรายการ...",
        }}
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (allVisibleSelected) setSelected(new Set());
              else setSelected(new Set(allVisibleIds));
            }}
            className="h-9"
          >
            {allVisibleSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
          </Button>
        }
      />

      {filteredGroups.length === 0 ? (
        <EmptyState
          message="ไม่พบรายการที่ค้นหา"
          subMessage="ลองเปลี่ยนคำค้นหาใหม่"
        />
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.contactId);
            const ids = group.expenses.map((e) => e.id);
            const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
            const someSel = ids.some((id) => selected.has(id));
            const deliveryInfo = getDeliveryMethod(group.deliveryMethod);

            const deliveryNode = group.mixedDeliveryMethods ? (
              <span className="flex items-center gap-1 text-amber-600">
                <Send className="h-3 w-3" />
                หลายวิธี
              </span>
            ) : deliveryInfo ? (
              <span className="flex items-center gap-1">
                <deliveryInfo.Icon className="h-3 w-3" />
                {deliveryInfo.label}
                {group.deliveryEmail && group.deliveryMethod === "EMAIL" && (
                  <span>({group.deliveryEmail})</span>
                )}
              </span>
            ) : (
              <span className="text-amber-600">ยังไม่ระบุวิธีส่ง</span>
            );

            return (
              <VendorCardShell
                key={group.contactId}
                vendorName={group.contactName}
                countLabel={`${group.count} รายการ`}
                totalWht={group.totalWhtAmount}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedGroups((prev) => toggleSet(prev, group.contactId))
                }
                rightExtra={deliveryNode}
                leadingSlot={
                  <Checkbox
                    checked={allSel ? true : someSel ? "indeterminate" : false}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = new Set(selected);
                      if (allSel) ids.forEach((id) => next.delete(id));
                      else ids.forEach((id) => next.add(id));
                      setSelected(next);
                    }}
                  />
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[640px]">
                    <colgroup>
                      <col className="w-12" />
                      <col className="w-32" />
                      <col />
                      <col className="w-20" />
                      <col className="w-36" />
                    </colgroup>
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="p-3"></th>
                        <th className="text-left p-3 font-medium">วันที่</th>
                        <th className="text-left p-3 font-medium">รายละเอียด</th>
                        <th className="text-right p-3 font-medium">WHT %</th>
                        <th className="text-right p-3 font-medium">ยอด WHT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.expenses.map((expense) => {
                        const checked = selected.has(expense.id);
                        const expenseDeliveryInfo = expense.whtDeliveryMethod
                          ? getDeliveryMethod(expense.whtDeliveryMethod)
                          : null;
                        return (
                          <tr
                            key={expense.id}
                            className={cn(
                              "border-t border-border/40 hover:bg-muted/40 transition-colors cursor-pointer",
                              checked && "bg-primary/5"
                            )}
                            onClick={() =>
                              setSelected((prev) => toggleSet(prev, expense.id))
                            }
                          >
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  setSelected((prev) =>
                                    toggleSet(prev, expense.id)
                                  )
                                }
                              />
                            </td>
                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                              {formatThaiDate(new Date(expense.billDate))}
                            </td>
                            <td className="p-3 truncate">
                              <button
                                type="button"
                                className="text-left hover:underline truncate max-w-full"
                                title={expense.description || "-"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/${companyCode}/expenses/${expense.id}`
                                  );
                                }}
                              >
                                {expense.description || "-"}
                              </button>
                              {expenseDeliveryInfo && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                                  <expenseDeliveryInfo.Icon className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {expenseDeliveryInfo.label}
                                    {expense.whtDeliveryMethod === "EMAIL" &&
                                      expense.whtDeliveryEmail &&
                                      ` (${expense.whtDeliveryEmail})`}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right text-muted-foreground tabular-nums">
                              {expense.whtRate}%
                            </td>
                            <td className="p-3 text-right font-medium tabular-nums">
                              {formatCurrency(expense.whtAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </VendorCardShell>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <StickyActionBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button
            size="sm"
            onClick={() => setShowMarkSentDialog(true)}
            className="h-8 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4 mr-2" />
            บันทึกส่งแล้ว
          </Button>
        </StickyActionBar>
      )}

      <Dialog open={showMarkSentDialog} onOpenChange={setShowMarkSentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              บันทึกการส่งใบ 50 ทวิ
            </DialogTitle>
            <DialogDescription>
              เลือก {selected.size} รายการ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>วิธีส่ง</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DELIVERY_METHODS.map((method) => {
                  const Icon = method.Icon;
                  const isActive = selectedDeliveryMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setSelectedDeliveryMethod(method.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left",
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เพิ่มหมายเหตุ..."
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarkSentDialog(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <LoadingButton
              onClick={handleMarkSent}
              loading={isSubmitting}
              disabled={!selectedDeliveryMethod}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4 mr-2" />
              ยืนยันส่งแล้ว
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Tab: รอใบจากลูกค้า (incoming-wait) — income
// =============================================================================

function IncomingWaitTab({ companyCode }: { companyCode: string }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<IncomeStageResponse>(
    wht(companyCode, "incoming-wait"),
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups = useMemo(() => data?.data?.groups || [], [data]);
  const totalPending = data?.data?.totalPending || 0;
  const totalWht = groups.reduce((s, g) => s + g.totalWhtAmount, 0);

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<{ id: string; action: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useExpandOnFirstLoad(groups);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        incomes: g.incomes.filter(
          (i) =>
            g.contactName.toLowerCase().includes(q) ||
            (i.source || "").toLowerCase().includes(q) ||
            (i.invoiceNumber || "").toLowerCase().includes(q)
        ),
      }))
      .filter(
        (g) => g.contactName.toLowerCase().includes(q) || g.incomes.length > 0
      );
  }, [groups, search]);

  const handleAction = async (
    incomeId: string,
    action: "receive_wht" | "remind_wht"
  ) => {
    setBusy({ id: incomeId, action });
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: "income",
          transactionId: incomeId,
          action,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || "ไม่สำเร็จ");
      }
      toast.success(
        action === "receive_wht"
          ? "บันทึกรับใบ 50 ทวิ แล้ว"
          : "ส่ง reminder แล้ว"
      );
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <ListSkeleton />;
  if (groups.length === 0) {
    return (
      <EmptyState
        message="ไม่มีรายการรอ"
        subMessage="ใบ 50 ทวิ จากลูกค้าทั้งหมดถูกบันทึกแล้ว"
      />
    );
  }

  return (
    <div className="space-y-4">
      <StageHeader
        description={STAGE_META["incoming-wait"].description}
        metrics={[
          { label: "รอรับ", value: totalPending },
          { label: "ลูกค้า", value: groups.length },
          {
            label: "ยอด WHT",
            value: formatCurrency(totalWht),
            tone: "text-blue-600 dark:text-blue-400",
          },
        ]}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "ค้นหาลูกค้า หรือเลขใบ...",
        }}
      />

      {filteredGroups.length === 0 ? (
        <EmptyState
          message="ไม่พบรายการที่ค้นหา"
          subMessage="ลองเปลี่ยนคำค้นหาใหม่"
        />
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.contactId);
            return (
              <VendorCardShell
                key={group.contactId}
                vendorName={group.contactName}
                contactInfo={
                  group.contact
                    ? {
                        email: group.contact.email,
                        phone: group.contact.phone,
                      }
                    : undefined
                }
                countLabel={`${group.count} รายการ`}
                totalWht={group.totalWhtAmount}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedGroups((prev) => toggleSet(prev, group.contactId))
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[760px]">
                    <colgroup>
                      <col className="w-32" />
                      <col />
                      <col className="w-20" />
                      <col className="w-36" />
                      <col className="w-20" />
                      <col className="w-56" />
                    </colgroup>
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left p-3 font-medium">วันที่รับ</th>
                        <th className="text-left p-3 font-medium">รายละเอียด</th>
                        <th className="text-right p-3 font-medium">WHT %</th>
                        <th className="text-right p-3 font-medium">ยอด WHT</th>
                        <th className="text-center p-3 font-medium">เตือน</th>
                        <th className="text-right p-3 font-medium">
                          การกระทำ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.incomes.map((income) => {
                        const isReceiving =
                          busy?.id === income.id &&
                          busy?.action === "receive_wht";
                        const isReminding =
                          busy?.id === income.id &&
                          busy?.action === "remind_wht";
                        return (
                          <tr
                            key={income.id}
                            className="border-t border-border/40 hover:bg-muted/40 transition-colors"
                          >
                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                              {formatThaiDate(new Date(income.receiveDate))}
                            </td>
                            <td className="p-3 truncate">
                              <button
                                type="button"
                                className="text-left hover:underline truncate max-w-full"
                                title={income.source || income.invoiceNumber || "-"}
                                onClick={() =>
                                  router.push(
                                    `/${companyCode}/incomes/${income.id}`
                                  )
                                }
                              >
                                {income.source || income.invoiceNumber || "-"}
                              </button>
                            </td>
                            <td className="p-3 text-right text-muted-foreground tabular-nums">
                              {income.whtRate}%
                            </td>
                            <td className="p-3 text-right font-medium tabular-nums">
                              {formatCurrency(income.whtAmount)}
                            </td>
                            <td className="p-3 text-center">
                              {income.whtCertRemindCount ? (
                                <Badge variant="outline" className="text-xs">
                                  {income.whtCertRemindCount}x
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1.5 justify-end">
                                <LoadingButton
                                  size="sm"
                                  variant="outline"
                                  loading={isReminding}
                                  disabled={isReceiving}
                                  onClick={() =>
                                    handleAction(income.id, "remind_wht")
                                  }
                                  className="h-8"
                                >
                                  <BellRing className="h-3.5 w-3.5 mr-1" />
                                  เตือน
                                </LoadingButton>
                                <LoadingButton
                                  size="sm"
                                  loading={isReceiving}
                                  disabled={isReminding}
                                  onClick={() =>
                                    handleAction(income.id, "receive_wht")
                                  }
                                  className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                  ได้รับแล้ว
                                </LoadingButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </VendorCardShell>
            );
          })}
        </div>
      )}
    </div>
  );
}
