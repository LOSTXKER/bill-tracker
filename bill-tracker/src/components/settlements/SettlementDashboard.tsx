"use client";

import { useState, useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { SettlementSummaryCards } from "./SettlementSummaryCards";
import { SettlementGroupCard } from "./SettlementGroupCard";
import { SettledGroupCard } from "./SettledGroupCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Inbox } from "lucide-react";

interface SettlementDashboardProps {
  companyCode: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SettlementDashboard({ companyCode }: SettlementDashboardProps) {
  const [tab, setTab] = useState<"pending" | "settled">("pending");
  const { mutate: globalMutate } = useSWRConfig();

  // Settlement API base path for batch revalidation
  const settlementBasePath = `/api/${companyCode}/settlements`;

  // Fetch summary data
  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useSWR(`${settlementBasePath}/summary`, fetcher);

  // Fetch pending settlements
  const {
    data: pendingData,
    isLoading: pendingLoading,
  } = useSWR(
    tab === "pending" ? `${settlementBasePath}?status=PENDING` : null,
    fetcher
  );

  // Fetch settled settlements
  const {
    data: settledData,
    isLoading: settledLoading,
  } = useSWR(
    tab === "settled" ? `${settlementBasePath}?status=SETTLED` : null,
    fetcher
  );

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

  const pendingGroups = pendingData?.data?.groups || [];
  const settledGroups = settledData?.data?.groups || [];
  const isLoading = tab === "pending" ? pendingLoading : settledLoading;
  const groups = tab === "pending" ? pendingGroups : settledGroups;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SettlementSummaryCards
        data={summaryData?.data}
        isLoading={summaryLoading}
      />

      {/* Main Content */}
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

      {/* Groups List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">
            {tab === "pending" ? "ไม่มีรายการรอโอนคืน" : "ยังไม่มีรายการโอนคืน"}
          </p>
          <p className="text-sm mt-1">
            {tab === "pending"
              ? "รายการที่จ่ายโดยพนักงานหรือคนภายนอกจะแสดงที่นี่"
              : "รายการที่โอนคืนแล้วจะแสดงที่นี่"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group: any, index: number) =>
            tab === "pending" ? (
              <SettlementGroupCard
                key={`${group.payerType}_${group.payerId || group.payerName}_${index}`}
                group={group}
                companyCode={companyCode}
                onSuccess={handleSettleSuccess}
              />
            ) : (
              <SettledGroupCard
                key={`${group.payerType}_${group.payerId || group.payerName}_${index}`}
                group={group}
                companyCode={companyCode}
                onSuccess={handleSettleSuccess}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
