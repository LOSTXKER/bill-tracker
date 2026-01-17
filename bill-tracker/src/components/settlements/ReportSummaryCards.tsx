"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, Users, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportSummary {
  totalSettled: number;
  settledCount: number;
  totalPending: number;
  pendingCount: number;
  personCount: number;
  personsWithPending: number;
}

interface ReportSummaryCardsProps {
  data: ReportSummary | null;
  isLoading: boolean;
}

export function ReportSummaryCards({ data, isLoading }: ReportSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSettled = data?.totalSettled || 0;
  const settledCount = data?.settledCount || 0;
  const totalPending = data?.totalPending || 0;
  const pendingCount = data?.pendingCount || 0;
  const personCount = data?.personCount || 0;
  const personsWithPending = data?.personsWithPending || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Settled */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">จ่ายแล้ว</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ฿{totalSettled.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {settledCount} รายการ
          </p>
        </CardContent>
      </Card>

      {/* Total Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">ค้างจ่าย</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            ฿{totalPending.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingCount} รายการ
          </p>
        </CardContent>
      </Card>

      {/* Persons with Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">รอรับเงิน</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {personsWithPending} คน
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            รอการโอนคืน
          </p>
        </CardContent>
      </Card>

      {/* Total Persons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {personCount} คน
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            มีประวัติการจ่าย
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
