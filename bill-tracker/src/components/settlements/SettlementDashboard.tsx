"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { SettlementSummaryCards } from "./SettlementSummaryCards";
import { SettlementRoundsTable } from "./SettlementRoundsTable";
import { PendingMonthSection } from "./PendingMonthSection";
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
import { RefreshCw, Inbox, User, X, Filter, AlertCircle } from "lucide-react";

interface SettlementDashboardProps {
  companyCode: string;
  filterUserId?: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const [tab, setTab] = useState<"pending" | "settled">("pending");
  const { mutate: globalMutate } = useSWRConfig();
  
  // Filter state for pending tab
  const [pendingMonth, setPendingMonth] = useState<string>("all");
  const [pendingYear, setPendingYear] = useState<string>("all");
  const [pendingEmployee, setPendingEmployee] = useState<string>("all");
  
  // Filter state for settled tab
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  // Settlement API base path for batch revalidation
  const settlementBasePath = `/api/${companyCode}/settlements`;

  // Fetch summary data
  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useSWR(`${settlementBasePath}/summary`, fetcher);

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
  } = useSWR(buildUrl("PENDING", "monthPayer"), fetcher);
  
  // Also fetch without filters to get all employees for dropdown
  const { data: allPendingData } = useSWR(
    `${settlementBasePath}?status=PENDING&groupBy=monthPayer`,
    fetcher
  );

  // Fetch settled settlements with groupBy=round
  const {
    data: settledData,
    isLoading: settledLoading,
  } = useSWR(
    tab === "settled" ? buildUrl("SETTLED", "round") : null,
    fetcher
  );

  // Fetch all settled without filters to get all employees for dropdown
  const { data: allSettledData } = useSWR(
    `${settlementBasePath}?status=SETTLED&groupBy=round`,
    fetcher
  );

  // Get unique employees from pending data for pending filter dropdown
  const pendingEmployeeOptions = useMemo(() => {
    const employeeMap = new Map<string, string>();
    
    // From pending month groups
    const monthGroups = allPendingData?.data?.monthGroups || [];
    monthGroups.forEach((monthGroup: any) => {
      monthGroup.payerGroups?.forEach((group: any) => {
        if (group.payerId && group.payerType === "USER") {
          employeeMap.set(group.payerId, group.payerName);
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
    
    // From settled rounds (all data)
    const settledRounds = allSettledData?.data?.rounds || [];
    settledRounds.forEach((round: any) => {
      round.payments?.forEach((payment: any) => {
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

  // OPTIMIZED: Single batch revalidation using global mutate with key matcher
  // This triggers a single revalidation pass instead of 3 separate API calls
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

  // OPTIMIZED: Use batch revalidation instead of 3 separate mutate calls
  const handleSettleSuccess = useCallback(() => {
    revalidateAllSettlements();
  }, [revalidateAllSettlements]);

  const pendingMonthGroups = pendingData?.data?.monthGroups || [];
  const settledRounds = settledData?.data?.rounds || [];
  const isLoading = tab === "pending" ? pendingLoading : settledLoading;

  // Clear filters for pending tab
  const handleClearPendingFilters = () => {
    setPendingMonth("all");
    setPendingYear("all");
    setPendingEmployee("all");
  };
  
  // Clear filters for settled tab
  const handleClearSettledFilters = () => {
    setSelectedMonth(String(currentMonth));
    setSelectedYear(String(currentDate.getFullYear()));
    setSelectedEmployee("all");
  };

  const hasPendingActiveFilters = pendingMonth !== "all" || 
    pendingYear !== "all" || 
    pendingEmployee !== "all";
    
  const hasSettledActiveFilters = selectedEmployee !== "all" || 
    selectedMonth !== String(currentMonth) || 
    selectedYear !== String(currentDate.getFullYear());

  // Get filtered user name from groups (if filtering)
  const filteredUserName = filterUserId && pendingMonthGroups.length > 0 
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
          data={summaryData?.data}
          isLoading={summaryLoading}
        />
      )}

      {/* Pending Approval Banner */}
      {summaryData?.data?.pending?.pendingApprovalCount > 0 && tab === "pending" && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-700 dark:text-amber-300">
              มี <strong>{summaryData.data.pending.pendingApprovalCount} รายการ</strong>รออนุมัติก่อนโอนคืน
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

      {/* Main Content */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "settled")}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-1">
                รอโอนคืน
                {summaryData?.data?.pending?.total?.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                    {summaryData.data.pending.total.count}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settled">โอนคืนแล้ว</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>

        {/* Filters for Pending Tab */}
        {tab === "pending" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={pendingMonth} onValueChange={setPendingMonth}>
              <SelectTrigger className="w-[140px] h-9">
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
              <SelectTrigger className="w-[100px] h-9">
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
              <SelectTrigger className="w-[180px] h-9">
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
                className="h-9 text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        )}
        
        {/* Filters for Settled Tab */}
        {tab === "settled" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-9">
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
              <SelectTrigger className="w-[100px] h-9">
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
              <SelectTrigger className="w-[180px] h-9">
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
                className="h-9 text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Groups List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tab === "pending" ? (
        pendingMonthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">ไม่มีรายการรอโอนคืน</p>
            <p className="text-sm mt-1">
              {hasPendingActiveFilters 
                ? "ไม่พบรายการตามเงื่อนไขที่กรอง ลองเปลี่ยนตัวกรอง"
                : "รายการที่จ่ายโดยพนักงานหรือคนภายนอกจะแสดงที่นี่"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingMonthGroups.map((monthGroup: any) => (
              <PendingMonthSection
                key={monthGroup.monthKey}
                monthGroup={monthGroup}
                companyCode={companyCode}
                onSuccess={handleSettleSuccess}
              />
            ))}
          </div>
        )
      ) : (
        /* Settled Tab - Use Table View */
        <SettlementRoundsTable
          rounds={settledRounds}
          companyCode={companyCode}
          onSuccess={handleSettleSuccess}
        />
      )}
    </div>
  );
}
