"use client";

import { use, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Coins,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  PieChart,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface ExpenseOverviewPageProps {
  params: Promise<{ company: string }>;
}

interface OverviewData {
  period: string;
  startDate: string;
  summary: {
    totalExpenses: number;
    expenseCount: number;
    byPayerType: {
      company: { total: number; label: string };
      pettyCash: { total: number; label: string };
      user: {
        total: number;
        pending: number;
        settled: number;
        label: string;
      };
    };
  };
  pettyCash: {
    balance: number;
    fundCount: number;
    lowBalanceCount: number;
    funds: Array<{
      id: string;
      name: string;
      balance: number;
      isLow: boolean;
    }>;
  };
  pendingSettlements: {
    total: number;
    count: number;
    byUser: Array<{
      userId: string;
      name: string;
      amount: number;
      count: number;
    }>;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExpenseOverviewPage({
  params,
}: ExpenseOverviewPageProps) {
  const { company: companyCode } = use(params);
  const router = useRouter();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const { data, isLoading } = useSWR<OverviewData>(
    `/api/${companyCode}/expense-overview?period=${period}`,
    fetcher
  );

  const getPeriodLabel = () => {
    switch (period) {
      case "month":
        return "เดือนนี้";
      case "quarter":
        return "ไตรมาสนี้";
      case "year":
        return "ปีนี้";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const summary = data?.summary;
  const pettyCash = data?.pettyCash;
  const pendingSettlements = data?.pendingSettlements;

  // Calculate percentages for pie chart visualization
  const total = summary?.totalExpenses || 1;
  const companyPercent = ((summary?.byPayerType.company.total || 0) / total) * 100;
  const pettyCashPercent = ((summary?.byPayerType.pettyCash.total || 0) / total) * 100;
  const userPercent = ((summary?.byPayerType.user.total || 0) / total) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="รายงานภาพรวมค่าใช้จ่าย"
          description="สถิติค่าใช้จ่ายแยกตามประเภทผู้จ่าย"
        />
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as any)}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="month">เดือน</TabsTrigger>
            <TabsTrigger value="quarter">ไตรมาส</TabsTrigger>
            <TabsTrigger value="year">ปี</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Total Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                รายจ่ายทั้งหมด{getPeriodLabel()}
              </p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(summary?.totalExpenses || 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                {summary?.expenseCount || 0} รายการ
              </p>
            </div>
            <div className="p-4 rounded-full bg-primary/10">
              <PieChart className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payer Type Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Company Paid */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                บริษัทจ่าย
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {companyPercent.toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary?.byPayerType.company.total || 0)}
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${companyPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Petty Cash */}
        <Card
          className={
            (pettyCash?.lowBalanceCount || 0) > 0
              ? "border-amber-300 dark:border-amber-700"
              : ""
          }
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-500" />
                เงินสดย่อย
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {pettyCashPercent.toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary?.byPayerType.pettyCash.total || 0)}
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${pettyCashPercent}%` }}
              />
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ยอดคงเหลือ</span>
                <span className="font-medium">
                  {formatCurrency(pettyCash?.balance || 0)}
                </span>
              </div>
              {(pettyCash?.lowBalanceCount || 0) > 0 && (
                <div className="flex items-center gap-1 mt-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs">
                    {pettyCash?.lowBalanceCount} กองทุนยอดต่ำ
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => router.push(`/${companyCode}/petty-cash`)}
              >
                จัดการเงินสดย่อย
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Paid (Pending Settlement) */}
        <Card
          className={
            (pendingSettlements?.total || 0) > 0
              ? "border-amber-300 dark:border-amber-700"
              : ""
          }
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                พนักงานจ่ายแทน
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {userPercent.toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary?.byPayerType.user.total || 0)}
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${userPercent}%` }}
              />
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">รอโอนคืน</span>
                <span className="font-medium text-amber-600">
                  {formatCurrency(pendingSettlements?.total || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">โอนคืนแล้ว</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(summary?.byPayerType.user.settled || 0)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => router.push(`/${companyCode}/reimbursements`)}
              >
                จัดการโอนคืน
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Settlements by User */}
      {pendingSettlements && pendingSettlements.byUser.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" />
                รายการรอโอนคืนพนักงาน
              </CardTitle>
              <Badge variant="secondary">
                {pendingSettlements.count} รายการ
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>พนักงาน</TableHead>
                  <TableHead className="text-center">จำนวนรายการ</TableHead>
                  <TableHead className="text-right">ยอดรอโอนคืน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSettlements.byUser.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-center">{user.count}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {formatCurrency(user.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">รวม</TableCell>
                  <TableCell className="text-center font-bold">
                    {pendingSettlements.count}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-600">
                    {formatCurrency(pendingSettlements.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Petty Cash Funds Status */}
      {pettyCash && pettyCash.funds.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-500" />
                สถานะกองทุนเงินสดย่อย
              </CardTitle>
              <Badge variant="secondary">{pettyCash.fundCount} กองทุน</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อกองทุน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pettyCash.funds.map((fund) => (
                  <TableRow
                    key={fund.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/${companyCode}/petty-cash/${fund.id}`)
                    }
                  >
                    <TableCell className="font-medium">{fund.name}</TableCell>
                    <TableCell>
                      {fund.isLow ? (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-600"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          ยอดต่ำ
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 border-emerald-600"
                        >
                          ปกติ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        fund.isLow ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(fund.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
