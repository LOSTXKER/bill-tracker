"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-config";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
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
// Helpers
// =============================================================================

function parseStage(value: string | null): Stage {
  if (value && (VALID_STAGES as string[]).includes(value)) return value as Stage;
  return "pending-send";
}

const STAGE_META: Record<
  Stage,
  { label: string; description: string }
> = {
  "pending-issue": {
    label: "รอออก 50 ทวิ",
    description:
      "รายจ่ายที่หัก ณ ที่จ่ายแล้วแต่ยังไม่ได้ออกหนังสือรับรอง 50 ทวิ ให้ vendor",
  },
  "pending-send": {
    label: "รอส่ง 50 ทวิ",
    description: "หนังสือ 50 ทวิ ออกแล้วแต่ยังไม่ได้ส่งให้ vendor",
  },
  "incoming-wait": {
    label: "รอใบจากลูกค้า",
    description:
      "รายรับที่ลูกค้าหัก ณ ที่จ่ายไว้แต่ยังไม่ได้ส่งใบ 50 ทวิ มาให้",
  },
};

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
    const url = `/${companyCode}/wht-deliveries${
      newStage === "pending-send" ? "" : `?stage=${newStage}`
    }`;
    router.replace(url, { scroll: false });
  };

  // ดึง count ของทุก stage แบบ parallel เพื่อโชว์ badge
  const { data: countIssue } = useSWR<ExpenseStageResponse>(
    companyCode
      ? `/api/${companyCode}/wht-deliveries?stage=pending-issue&groupBy=contact`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: countSend } = useSWR<ExpenseStageResponse>(
    companyCode
      ? `/api/${companyCode}/wht-deliveries?stage=pending-send&groupBy=contact`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: countIncoming } = useSWR<IncomeStageResponse>(
    companyCode
      ? `/api/${companyCode}/wht-deliveries?stage=incoming-wait&groupBy=contact`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const refreshAll = async () => {
    // SWR's mutate via key — reload all 3
    await Promise.all([
      fetch(
        `/api/${companyCode}/wht-deliveries?stage=pending-issue&groupBy=contact`
      ),
      fetch(
        `/api/${companyCode}/wht-deliveries?stage=pending-send&groupBy=contact`
      ),
      fetch(
        `/api/${companyCode}/wht-deliveries?stage=incoming-wait&groupBy=contact`
      ),
    ]);
    // Also trigger SWR revalidation
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("focus"));
    }
  };

  const meta = STAGE_META[stage];

  return (
    <PermissionGuard permission="expenses:read">
      <div className="space-y-6">
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

        <Tabs value={stage} onValueChange={handleStageChange}>
          <TabsList className="h-auto">
            <TabsTrigger value="pending-issue" className="gap-2">
              <FilePlus className="h-4 w-4" />
              รอออก 50 ทวิ
              <StageBadge total={countIssue?.data?.totalPending} />
            </TabsTrigger>
            <TabsTrigger value="pending-send" className="gap-2">
              <Send className="h-4 w-4" />
              รอส่ง 50 ทวิ
              <StageBadge total={countSend?.data?.totalPending} />
            </TabsTrigger>
            <TabsTrigger value="incoming-wait" className="gap-2">
              <BellRing className="h-4 w-4" />
              รอใบจากลูกค้า
              <StageBadge total={countIncoming?.data?.totalPending} />
            </TabsTrigger>
          </TabsList>

          <p className="text-sm text-muted-foreground">{meta.description}</p>

          <TabsContent value="pending-issue" className="mt-4">
            <PendingIssueTab companyCode={companyCode} />
          </TabsContent>
          <TabsContent value="pending-send" className="mt-4">
            <PendingSendTab companyCode={companyCode} />
          </TabsContent>
          <TabsContent value="incoming-wait" className="mt-4">
            <IncomingWaitTab companyCode={companyCode} />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function StageBadge({ total }: { total: number | undefined }) {
  if (total === undefined) return null;
  if (total === 0) {
    return (
      <Badge variant="outline" className="ml-1 text-xs">
        0
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="ml-1 text-xs">
      {total}
    </Badge>
  );
}

// =============================================================================
// Tab: รอออก 50 ทวิ (pending-issue)
// =============================================================================

function PendingIssueTab({ companyCode }: { companyCode: string }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<ExpenseStageResponse>(
    `/api/${companyCode}/wht-deliveries?stage=pending-issue&groupBy=contact`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups = data?.data?.groups || [];
  const totalPending = data?.data?.totalPending || 0;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useExpandOnFirstLoad(groups);

  const handleIssue = async (expenseId: string) => {
    setBusyId(expenseId);
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: "expense",
          transactionId: expenseId,
          action: "issue_wht",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || "ไม่สามารถออกหนังสือ 50 ทวิ ได้");
      }
      toast.success("ออกหนังสือ 50 ทวิ แล้ว");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <SummaryCards
        totals={{
          totalPending,
          contactCount: groups.length,
          totalWht: groups.reduce((sum, g) => sum + g.totalWhtAmount, 0),
        }}
        labels={{
          totalLabel: "รอออกทั้งหมด",
          contactLabel: "จำนวน Vendor",
          totalWhtLabel: "ยอด WHT รวม",
        }}
      />

      {isLoading ? (
        <ListSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState
          message="ไม่มีรายการรอออก 50 ทวิ"
          subMessage="หนังสือ 50 ทวิ สำหรับรายจ่ายทั้งหมดถูกออกแล้ว"
        />
      ) : (
        groups.map((group) => {
          const isExpanded = expandedGroups.has(group.contactId);
          return (
            <Card key={group.contactId}>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedGroups((prev) => toggleSet(prev, group.contactId))
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {group.contactName}
                      <Badge variant="secondary">{group.count} รายการ</Badge>
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(group.totalWhtAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ยอด WHT
                    </div>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">วันที่</th>
                          <th className="text-left p-2">รายละเอียด</th>
                          <th className="text-right p-2">WHT %</th>
                          <th className="text-right p-2">ยอด WHT</th>
                          <th className="text-right p-2 w-32">การกระทำ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.expenses.map((expense) => (
                          <tr
                            key={expense.id}
                            className="border-t hover:bg-muted/30"
                          >
                            <td className="p-2">
                              {formatThaiDate(new Date(expense.billDate))}
                            </td>
                            <td className="p-2">
                              <span
                                className="hover:underline text-primary cursor-pointer"
                                onClick={() =>
                                  router.push(
                                    `/${companyCode}/expenses/${expense.id}`
                                  )
                                }
                              >
                                {expense.description || "-"}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              {expense.whtRate}%
                            </td>
                            <td className="p-2 text-right font-medium">
                              {formatCurrency(expense.whtAmount)}
                            </td>
                            <td className="p-2 text-right">
                              <LoadingButton
                                size="sm"
                                loading={busyId === expense.id}
                                onClick={() => handleIssue(expense.id)}
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                <FilePlus className="h-4 w-4 mr-1" />
                                ออก 50 ทวิ
                              </LoadingButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
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
    `/api/${companyCode}/wht-deliveries?stage=pending-send&groupBy=contact`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups = data?.data?.groups || [];
  const totalPending = data?.data?.totalPending || 0;

  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(
    new Set()
  );
  const [showMarkSentDialog, setShowMarkSentDialog] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useExpandOnFirstLoad(groups);

  const toggleExpense = (expenseId: string) => {
    setSelectedExpenses((prev) => toggleSet(prev, expenseId));
  };

  const toggleAllInGroup = (group: ExpenseContactGroup) => {
    const allSelected = group.expenses.every((e) => selectedExpenses.has(e.id));
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        group.expenses.forEach((e) => next.delete(e.id));
      } else {
        group.expenses.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const handleMarkSent = async () => {
    if (selectedExpenses.size === 0) {
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
          expenseIds: Array.from(selectedExpenses),
          deliveryMethod: selectedDeliveryMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message || "อัปเดตสถานะสำเร็จ");
        setShowMarkSentDialog(false);
        setSelectedExpenses(new Set());
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SummaryCards
          totals={{
            totalPending,
            contactCount: groups.length,
            totalWht: groups.reduce((sum, g) => sum + g.totalWhtAmount, 0),
          }}
          labels={{
            totalLabel: "รอส่งทั้งหมด",
            contactLabel: "จำนวน Vendor",
            totalWhtLabel: "ยอด WHT รวม",
          }}
          extra={{
            label: "เลือกแล้ว",
            value: selectedExpenses.size,
            valueClass: "text-emerald-600",
          }}
        />
        {selectedExpenses.size > 0 && (
          <Button
            size="sm"
            onClick={() => setShowMarkSentDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 self-start mt-1"
          >
            <Send className="h-4 w-4 mr-2" />
            ส่งแล้ว ({selectedExpenses.size})
          </Button>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState
          message="ไม่มีรายการรอส่ง"
          subMessage="ใบหัก ณ ที่จ่าย ทั้งหมดถูกส่งให้ vendor แล้ว"
        />
      ) : (
        groups.map((group) => {
          const isExpanded = expandedGroups.has(group.contactId);
          const allSelected = group.expenses.every((e) =>
            selectedExpenses.has(e.id)
          );
          const someSelected = group.expenses.some((e) =>
            selectedExpenses.has(e.id)
          );
          const deliveryInfo = getDeliveryMethod(group.deliveryMethod);

          return (
            <Card key={group.contactId}>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedGroups((prev) => toggleSet(prev, group.contactId))
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={
                        allSelected
                          ? true
                          : someSelected
                          ? "indeterminate"
                          : false
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllInGroup(group);
                      }}
                    />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {group.contactName}
                        <Badge variant="secondary">
                          {group.count} รายการ
                        </Badge>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        {group.mixedDeliveryMethods ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Send className="h-4 w-4" />
                            หลายวิธี (ดูในแต่ละรายการ)
                          </span>
                        ) : deliveryInfo ? (() => {
                          const Icon = deliveryInfo.Icon;
                          return (
                            <span className="flex items-center gap-1">
                              <Icon className="h-4 w-4" />
                              {deliveryInfo.label}
                              {group.deliveryEmail &&
                                group.deliveryMethod === "EMAIL" && (
                                  <span className="text-xs">
                                    ({group.deliveryEmail})
                                  </span>
                                )}
                            </span>
                          );
                        })() : (
                          <span className="text-amber-600">
                            ยังไม่ระบุวิธีส่ง
                          </span>
                        )}
                        {group.deliveryNotes && !group.mixedDeliveryMethods && (
                          <span className="text-xs">
                            • {group.deliveryNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(group.totalWhtAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ยอด WHT
                    </div>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="w-8 p-2"></th>
                          <th className="text-left p-2">วันที่</th>
                          <th className="text-left p-2">รายละเอียด</th>
                          <th className="text-right p-2">WHT %</th>
                          <th className="text-right p-2">ยอด WHT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.expenses.map((expense) => {
                          const expenseDeliveryInfo = expense.whtDeliveryMethod
                            ? getDeliveryMethod(expense.whtDeliveryMethod)
                            : null;
                          return (
                            <tr
                              key={expense.id}
                              className="border-t hover:bg-muted/30 cursor-pointer"
                              onClick={() => toggleExpense(expense.id)}
                            >
                              <td className="p-2">
                                <Checkbox
                                  checked={selectedExpenses.has(expense.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() =>
                                    toggleExpense(expense.id)
                                  }
                                />
                              </td>
                              <td className="p-2">
                                {formatThaiDate(new Date(expense.billDate))}
                              </td>
                              <td className="p-2">
                                <div>
                                  <span
                                    className="hover:underline text-primary cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(
                                        `/${companyCode}/expenses/${expense.id}`
                                      );
                                    }}
                                  >
                                    {expense.description || "-"}
                                  </span>
                                  {expenseDeliveryInfo && (() => {
                                    const Icon = expenseDeliveryInfo.Icon;
                                    return (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                        <Icon className="h-3 w-3" />
                                        <span>{expenseDeliveryInfo.label}</span>
                                        {expense.whtDeliveryMethod === "EMAIL" &&
                                          expense.whtDeliveryEmail && (
                                            <span>
                                              ({expense.whtDeliveryEmail})
                                            </span>
                                          )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="p-2 text-right">
                                {expense.whtRate}%
                              </td>
                              <td className="p-2 text-right font-medium">
                                {formatCurrency(expense.whtAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={showMarkSentDialog} onOpenChange={setShowMarkSentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              บันทึกการส่งใบ 50 ทวิ
            </DialogTitle>
            <DialogDescription>
              เลือก {selectedExpenses.size} รายการ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>วิธีส่ง</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DELIVERY_METHODS.map((method) => {
                  const Icon = method.Icon;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={
                        selectedDeliveryMethod === method.value
                          ? "default"
                          : "outline"
                      }
                      className="justify-start gap-2 h-auto py-3"
                      onClick={() => setSelectedDeliveryMethod(method.value)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{method.label}</span>
                    </Button>
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
    `/api/${companyCode}/wht-deliveries?stage=incoming-wait&groupBy=contact`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups = data?.data?.groups || [];
  const totalPending = data?.data?.totalPending || 0;

  const [busy, setBusy] = useState<{ id: string; action: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useExpandOnFirstLoad(groups);

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

  return (
    <div className="space-y-4">
      <SummaryCards
        totals={{
          totalPending,
          contactCount: groups.length,
          totalWht: groups.reduce((sum, g) => sum + g.totalWhtAmount, 0),
        }}
        labels={{
          totalLabel: "รอรับทั้งหมด",
          contactLabel: "จำนวนลูกค้า",
          totalWhtLabel: "ยอด WHT รวม",
        }}
      />

      {isLoading ? (
        <ListSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState
          message="ไม่มีรายการรอ"
          subMessage="ใบ 50 ทวิ จากลูกค้าทั้งหมดถูกบันทึกแล้ว"
        />
      ) : (
        groups.map((group) => {
          const isExpanded = expandedGroups.has(group.contactId);
          return (
            <Card key={group.contactId}>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedGroups((prev) => toggleSet(prev, group.contactId))
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {group.contactName}
                      <Badge variant="secondary">{group.count} รายการ</Badge>
                    </CardTitle>
                    {group.contact?.email && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {group.contact.email}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(group.totalWhtAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ยอด WHT รอ
                    </div>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">วันที่รับ</th>
                          <th className="text-left p-2">รายละเอียด</th>
                          <th className="text-right p-2">WHT %</th>
                          <th className="text-right p-2">ยอด WHT</th>
                          <th className="text-center p-2">เตือนแล้ว</th>
                          <th className="text-right p-2 w-56">การกระทำ</th>
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
                              className="border-t hover:bg-muted/30"
                            >
                              <td className="p-2">
                                {formatThaiDate(new Date(income.receiveDate))}
                              </td>
                              <td className="p-2">
                                <span
                                  className="hover:underline text-primary cursor-pointer"
                                  onClick={() =>
                                    router.push(
                                      `/${companyCode}/incomes/${income.id}`
                                    )
                                  }
                                >
                                  {income.source ||
                                    income.invoiceNumber ||
                                    "-"}
                                </span>
                              </td>
                              <td className="p-2 text-right">
                                {income.whtRate}%
                              </td>
                              <td className="p-2 text-right font-medium">
                                {formatCurrency(income.whtAmount)}
                              </td>
                              <td className="p-2 text-center">
                                {income.whtCertRemindCount ? (
                                  <Badge variant="outline">
                                    {income.whtCertRemindCount}x
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                <div className="flex gap-2 justify-end">
                                  <LoadingButton
                                    size="sm"
                                    variant="outline"
                                    loading={isReminding}
                                    disabled={isReceiving}
                                    onClick={() =>
                                      handleAction(income.id, "remind_wht")
                                    }
                                  >
                                    <BellRing className="h-4 w-4 mr-1" />
                                    เตือน
                                  </LoadingButton>
                                  <LoadingButton
                                    size="sm"
                                    loading={isReceiving}
                                    disabled={isReminding}
                                    onClick={() =>
                                      handleAction(income.id, "receive_wht")
                                    }
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    <CheckCheck className="h-4 w-4 mr-1" />
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
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

// =============================================================================
// Shared sub-components
// =============================================================================

function SummaryCards({
  totals,
  labels,
  extra,
}: {
  totals: { totalPending: number; contactCount: number; totalWht: number };
  labels: {
    totalLabel: string;
    contactLabel: string;
    totalWhtLabel: string;
  };
  extra?: { label: string; value: number; valueClass?: string };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">{labels.totalLabel}</div>
          <div className="text-2xl font-bold">{totals.totalPending}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            {labels.contactLabel}
          </div>
          <div className="text-2xl font-bold">{totals.contactCount}</div>
        </CardContent>
      </Card>
      {extra ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{extra.label}</div>
            <div className={`text-2xl font-bold ${extra.valueClass || ""}`}>
              {extra.value}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            {labels.totalWhtLabel}
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(totals.totalWht)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
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
    <Card>
      <CardContent className="py-12 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{message}</h3>
        <p className="text-muted-foreground">{subMessage}</p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Hooks / utilities
// =============================================================================

function toggleSet<T>(prev: Set<T>, key: T): Set<T> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/**
 * Auto-expand all group rows the first time data arrives.
 * Subsequent refetches won't re-expand (respects user's collapse intent).
 */
function useExpandOnFirstLoad<T extends { contactId: string }>(
  groups: T[]
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const hasAutoExpandedRef = useRef(false);

  // Stable signal: only triggers when count goes from 0 to non-zero
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
