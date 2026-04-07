"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { SettlementSummaryCards } from "./SettlementSummaryCards";
import { SettlementRoundsTable, type SettlementRound } from "./SettlementRoundsTable";
import { SettlementGroupCard } from "./SettlementGroupCard";
import type { MonthGroup, PayerGroup } from "./PendingMonthSection";
import { SettlementTransferList } from "@/components/settlement-transfers/SettlementTransferList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw, Inbox, User, X, AlertCircle } from "lucide-react";
import { fetcher } from "@/lib/utils/fetcher";

/** SWR payload: GET /settlements/summary (matches SettlementSummaryCards + dashboard fields) */
type SettlementSummarySWR = {
  data: {
    pending: {
      total: { count: number; amount: number };
      topUsers?: Array<{
        userId: string | null;
        name: string;
        count: number;
        amount: number;
      }>;
      pendingApprovalCount: number;
    };
    settledThisMonth: { count: number; amount: number };
  };
};

/** SWR payload: GET /settlements (list); monthGroups when groupBy=monthPayer */
type SettlementListSWR = {
  data: {
    monthGroups?: MonthGroup[];
    rounds?: SettlementRound[];
  };
};

interface SettlementDashboardProps {
  companyCode: string;
  filterUserId?: string | null;
  initialTab?: string | null;
}

// Generate month/year options
const currentDate = new Date();
const currentYear = currentDate.getFullYear() + 543; // Buddhist year
const currentMonth = currentDate.getMonth() + 1;

const months = [
  { value: "1", label: "มกราคม" },
  { value: "2", label: "กุมภาพันธ์" },
  { value: "3", label: "มีนาคม" },
  { value: "4", label: "เมษายน" },
  { value: "5", label: "พฤษภาคม" },
  { value: "6", label: "มิถุนายน" },
  { value: "7", label: "กรกฎาคม" },
  { value: "8", label: "สิงหาคม" },
  { value: "9", label: "กันยายน" },
  { value: "10", label: "ตุลาคม" },
  { value: "11", label: "พฤศจิกายน" },
  { value: "12", label: "ธันวาคม" },
];

const years = Array.from({ length: 5 }, (_, i) => {
  const year = currentYear - i;
  return { value: String(year - 543), label: `${year}` }; // Store Gregorian, display Buddhist
});

export function SettlementDashboard({ companyCode, filterUserId }: SettlementDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mutate: globalMutate } = useSWRConfig();

  // Tab state via URL param (?tab=pending|settled|transfers)
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "settled" || tabParam === "transfers" ? tabParam : "pending";

  const updateSearchParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const setTab = useCallback(
    (value: string) => updateSearchParam("tab", value === "pending" ? undefined : value),
    [updateSearchParam]
  );

  // Filter state for pending tab (URL params)
  const pendingMonth = searchParams.get("pm") || "all";
  const pendingYear = searchParams.get("py") || "all";
  const pendingEmployee = searchParams.get("pe") || "all";

  const setPendingMonth = (v: string) => updateSearchParam("pm", v === "all" ? undefined : v);
  const setPendingYear = (v: string) => updateSearchParam("py", v === "all" ? undefined : v);
  const setPendingEmployee = (v: string) => updateSearchParam("pe", v === "all" ? undefined : v);

  // Filter state for settled tab (URL params)
  const selectedMonth = searchParams.get("sm") || String(currentMonth);
  const selectedYear = searchParams.get("sy") || String(currentDate.getFullYear());
  const selectedEmployee = searchParams.get("se") || "all";

  const setSelectedMonth = (v: string) => updateSearchParam("sm", v);
  const setSelectedYear = (v: string) => updateSearchParam("sy", v);
  const setSelectedEmployee = (v: string) => updateSearchParam("se", v === "all" ? undefined : v);

  // Settlement API base path for batch revalidation
  const settlementBasePath = `/api/${companyCode}/settlements`;

  // Fetch summary data
  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useSWR<SettlementSummarySWR>(`${settlementBasePath}/summary`, fetcher);

  // Build URL with optional userId filter
  const buildUrl = (status: string, groupBy?: string) => {
    const params = new URLSearchParams({ status });
    if (filterUserId) {
      params.set("userId", filterUserId);
    }
    if (groupBy) {
      params.set("groupBy", groupBy);
    }
    // Add date filters for pending tab
    if (status === "PENDING") {
      if (pendingMonth && pendingMonth !== "all") {
        params.set("month", pendingMonth);
      }
      if (pendingYear && pendingYear !== "all") {
        params.set("year", pendingYear);
      }
      if (pendingEmployee && pendingEmployee !== "all") {
        params.set("userId", pendingEmployee);
      }
    }
    // Add date filters for settled tab
    if (status === "SETTLED") {
      if (selectedMonth && selectedMonth !== "all") {
        params.set("month", selectedMonth);
      }
      if (selectedYear) {
        params.set("year", selectedYear);
      }
      if (selectedEmployee && selectedEmployee !== "all") {
        params.set("userId", selectedEmployee);
      }
    }
    return `${settlementBasePath}?${params.toString()}`;
  };

  // Fetch pending settlements with month grouping
  const {
    data: pendingData,
    isLoading: pendingLoading,
  } = useSWR<SettlementListSWR>(buildUrl("PENDING", "monthPayer"), fetcher);

  // Also fetch without filters to get all employees for dropdown
  const { data: allPendingData } = useSWR<SettlementListSWR>(
    `${settlementBasePath}?status=PENDING&groupBy=monthPayer`,
    fetcher
  );

  // Fetch settled settlements with groupBy=round
  const {
    data: settledData,
    isLoading: settledLoading,
  } = useSWR<SettlementListSWR>(
    tab === "settled" ? buildUrl("SETTLED", "round") : null,
    fetcher
  );

  // Fetch all settled without filters to get all employees for dropdown
  const { data: allSettledData } = useSWR<SettlementListSWR>(
    `${settlementBasePath}?status=SETTLED&groupBy=round`,
    fetcher
  );

  // Get unique employees from pending data for pending filter dropdown
  const pendingEmployeeOptions = useMemo(() => {
    const employeeMap = new Map<string, string>();

    const monthGroups = allPendingData?.data?.monthGroups || [];
    monthGroups.forEach((monthGroup) => {
      monthGroup.payerGroups?.forEach((group) => {
        if (group.payerId && group.payerType === "USER") {
          employeeMap.set(group.payerId, group.payerName ?? "");
        }
      });
    });

    const employees: { value: string; label: string }[] = [
      { value: "all", label: "พนักงานทั้งหมด" },
    ];

    employeeMap.forEach((name, id) => {
      employees.push({ value: id, label: name });
    });

    return employees;
  }, [allPendingData]);

  // Get unique employees from settled data for settled filter dropdown
  const settledEmployeeOptions = useMemo(() => {
    const employeeMap = new Map<string, string>();

    const settledRounds = allSettledData?.data?.rounds || [];
    settledRounds.forEach((round) => {
      round.payments?.forEach((payment) => {
        if (payment.paidByUserId && payment.PaidByUser) {
          employeeMap.set(payment.paidByUserId, payment.PaidByUser.name);
        }
      });
    });

    const employees: { value: string; label: string }[] = [
      { value: "all", label: "พนักงานทั้งหมด" },
    ];

    employeeMap.forEach((name, id) => {
      employees.push({ value: id, label: name });
    });

    return employees;
  }, [allSettledData]);

  // Single batch revalidation using global mutate with key matcher
  const revalidateAllSettlements = useCallback(() => {
    globalMutate(
      (key) => typeof key === "string" && key.startsWith(settlementBasePath),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate, settlementBasePath]);

  const handleRefresh = useCallback(() => {
    revalidateAllSettlements();
  }, [revalidateAllSettlements]);

  const handleSettleSuccess = useCallback(() => {
    revalidateAllSettlements();
  }, [revalidateAllSettlements]);

  const pendingMonthGroups = pendingData?.data?.monthGroups || [];
  const settledRounds = settledData?.data?.rounds || [];
  const isLoading = tab === "pending" ? pendingLoading : tab === "settled" ? settledLoading : false;

  // Flatten monthGroups into a single list of payerGroups for a cleaner layout
  const flattenedPayerGroups = useMemo(() => {
    const groups: (PayerGroup & { monthLabel: string })[] = [];
    pendingMonthGroups.forEach((mg) => {
      mg.payerGroups.forEach((pg) => {
        groups.push({ ...pg, monthLabel: mg.monthLabel });
      });
    });
    return groups;
  }, [pendingMonthGroups]);

  // Clear filters for pending tab
  const handleClearPendingFilters = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("pm");
    next.delete("py");
    next.delete("pe");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Clear filters for settled tab (reset to current month/year)
  const handleClearSettledFilters = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sm", String(currentMonth));
    next.set("sy", String(currentDate.getFullYear()));
    next.delete("se");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const hasPendingActiveFilters =
    pendingMonth !== "all" || pendingYear !== "all" || pendingEmployee !== "all";

  const hasSettledActiveFilters =
    selectedEmployee !== "all" ||
    selectedMonth !== String(currentMonth) ||
    selectedYear !== String(currentDate.getFullYear());

  // Get filtered user name from groups (if filtering by userId)
  const filteredUserName =
    filterUserId && pendingMonthGroups.length > 0
      ? pendingMonthGroups[0]?.payerGroups?.[0]?.payerName
      : filterUserId && settledRounds.length > 0
        ? settledRounds[0]?.payerSummary?.split(" (")[0]
        : null;

  return (
    <div className="space-y-6">
      {/* Filter Banner */}
      {filterUserId && (
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <User className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-700 dark:text-blue-300">
              กำลังแสดงรายการของ: <strong>{filteredUserName || "กำลังโหลด..."}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            >
              <Link href={`/${companyCode}/reimbursements`}>
                <X className="h-3.5 w-3.5" />
                ดูทั้งหมด
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards - hide when filtering by user */}
      {!filterUserId && (
        <SettlementSummaryCards
          data={summaryData?.data ?? null}
          isLoading={summaryLoading}
        />
      )}

      {/* Pending Approval Banner */}
      {(summaryData?.data?.pending?.pendingApprovalCount ?? 0) > 0 && tab === "pending" && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-700 dark:text-amber-300">
              มี <strong>{summaryData?.data?.pending?.pendingApprovalCount} รายการ</strong>รออนุมัติก่อนโอนคืน
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              <Link href={`/${companyCode}/approvals`}>
                ไปอนุมัติ
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs + Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-1">
                รอโอนคืน
                {(summaryData?.data?.pending?.total?.count ?? 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full">
                    {summaryData?.data?.pending?.total?.count}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settled">โอนคืนแล้ว</TabsTrigger>
              <TabsTrigger value="transfers">รายการโอนเงินคืน</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab !== "transfers" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 text-muted-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              รีเฟรช
            </Button>
          )}
        </div>

        {/* Inline Filters for Pending Tab */}
        {tab === "pending" && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={pendingMonth} onValueChange={setPendingMonth}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="เดือน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกเดือน</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pendingYear} onValueChange={setPendingYear}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue placeholder="ปี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกปี</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pendingEmployee} onValueChange={setPendingEmployee}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="พนักงาน" />
              </SelectTrigger>
              <SelectContent>
                {pendingEmployeeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasPendingActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPendingFilters}
                className="h-8 text-xs text-muted-foreground px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                ล้าง
              </Button>
            )}
          </div>
        )}

        {/* Inline Filters for Settled Tab */}
        {tab === "settled" && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="เดือน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกเดือน</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue placeholder="ปี" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="พนักงาน" />
              </SelectTrigger>
              <SelectContent>
                {settledEmployeeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasSettledActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSettledFilters}
                className="h-8 text-xs text-muted-foreground px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                ล้าง
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      {tab === "transfers" ? (
        <SettlementTransferList companyCode={companyCode} />
      ) : isLoading ? (
        <div className="space-y-3 stagger-children">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/50 shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : tab === "pending" ? (
        flattenedPayerGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">ไม่มีรายการรอโอนคืน</p>
            <p className="text-sm mt-1">
              {hasPendingActiveFilters
                ? "ไม่พบรายการตามเงื่อนไขที่กรอง ลองเปลี่ยนตัวกรอง"
                : "รายการที่จ่ายโดยพนักงานหรือคนภายนอกจะแสดงที่นี่"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {flattenedPayerGroups.map((group, index) => (
              <SettlementGroupCard
                key={`${group.payerType}_${group.payerId || group.payerName}_${index}`}
                group={group}
                companyCode={companyCode}
                onSuccess={handleSettleSuccess}
                monthLabel={group.monthLabel}
              />
            ))}
          </div>
        )
      ) : (
        <SettlementRoundsTable
          rounds={settledRounds}
          companyCode={companyCode}
          onSuccess={handleSettleSuccess}
        />
      )}
    </div>
  );
}
