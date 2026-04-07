"use client";

import { use, useState } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Coins,
  Users,
  Wallet,
  AlertTriangle,
  ArrowRight,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Receipt,
  Hash,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { fetcher } from "@/lib/utils/fetcher";

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

const PAYER_COLORS = {
  company: { bg: "hsl(217, 91%, 60%)", label: "บริษัทจ่าย" },
  pettyCash: { bg: "hsl(160, 84%, 39%)", label: "เงินสดย่อย" },
  user: { bg: "hsl(271, 91%, 65%)", label: "พนักงานจ่ายแทน" },
};

function PieChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: { color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="font-medium text-card-foreground">{entry.name}</span>
      </div>
      <p className="text-sm font-medium text-card-foreground mt-1">
        {formatCurrency(entry.value)}
      </p>
    </div>
  );
}

export default function ExpenseOverviewPage({
  params,
}: ExpenseOverviewPageProps) {
  const { company: companyCode } = use(params);
  const router = useRouter();

  const now = new Date();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: response, isLoading, error, mutate } = useSWR<{ success: boolean; data: OverviewData }>(
    `/api/${companyCode}/expense-overview?period=${period}&month=${month}&year=${year}`,
    fetcher
  );
  const data = response?.data;

  const monthLabel = new Date(year, month - 1).toLocaleDateString(APP_LOCALE, { month: "long", timeZone: APP_TIMEZONE });
  const isCurrentOrFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  const handlePrevMonth = () => {
    if (period === "year") {
      setYear((y) => y - 1);
    } else if (period === "quarter") {
      if (month <= 3) { setMonth(10); setYear((y) => y - 1); }
      else setMonth((m) => m - 3);
    } else {
      if (month === 1) { setMonth(12); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (period === "year") {
      setYear((y) => y + 1);
    } else if (period === "quarter") {
      if (month >= 10) { setMonth(1); setYear((y) => y + 1); }
      else setMonth((m) => m + 3);
    } else {
      if (month === 12) { setMonth(1); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }
  };

  const getPeriodNavLabel = () => {
    if (period === "year") return `${year + 543}`;
    if (period === "quarter") {
      const q = Math.floor((month - 1) / 3) + 1;
      return `Q${q} ${year + 543}`;
    }
    return `${monthLabel} ${year + 543}`;
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-64 lg:col-span-2 rounded-lg" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error || (response && !response.success)) {
    return (
      <div className="space-y-5">
        <PageHeader
          icon={PieChartIcon}
          title="รายงานภาพรวมค่าใช้จ่าย"
          description="สถิติค่าใช้จ่ายแยกตามประเภทผู้จ่าย"
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่</span>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              ลองใหม่
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summary = data?.summary;
  const pettyCash = data?.pettyCash;
  const pendingSettlements = data?.pendingSettlements;

  const total = summary?.totalExpenses || 1;
  const companyPercent = ((summary?.byPayerType.company.total || 0) / total) * 100;
  const pettyCashPercent = ((summary?.byPayerType.pettyCash.total || 0) / total) * 100;
  const userPercent = ((summary?.byPayerType.user.total || 0) / total) * 100;

  const chartData = [
    { name: "บริษัทจ่าย", value: summary?.byPayerType.company.total || 0, color: PAYER_COLORS.company.bg },
    { name: "เงินสดย่อย", value: summary?.byPayerType.pettyCash.total || 0, color: PAYER_COLORS.pettyCash.bg },
    { name: "พนักงานจ่ายแทน", value: summary?.byPayerType.user.total || 0, color: PAYER_COLORS.user.bg },
  ].filter((d) => d.value > 0);

  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      {/* Header with period tabs */}
      <PageHeader
        icon={PieChartIcon}
        title="รายงานภาพรวมค่าใช้จ่าย"
        description="สถิติค่าใช้จ่ายแยกตามประเภทผู้จ่าย"
        actions={
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as "month" | "quarter" | "year")}
          >
            <TabsList>
              <TabsTrigger value="month">เดือน</TabsTrigger>
              <TabsTrigger value="quarter">ไตรมาส</TabsTrigger>
              <TabsTrigger value="year">ปี</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Month/Year Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handlePrevMonth}
            aria-label="ช่วงก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center select-none">
            {getPeriodNavLabel()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleNextMonth}
            disabled={isCurrentOrFuture}
            aria-label="ช่วงถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {period !== "year" && (
          <Select value={year.toString()} onValueChange={(y) => setYear(parseInt(y))}>
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => (
                <SelectItem key={i} value={(thisYear - i).toString()}>
                  {thisYear - i + 543}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            รายจ่ายทั้งหมด
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">
            {formatCurrency(summary?.totalExpenses || 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Hash className="h-3 w-3" />
            จำนวนรายการ
          </p>
          <p className="text-xl font-bold mt-0.5">
            {summary?.expenseCount || 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3 text-blue-500" />
            บริษัทจ่าย
          </p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {companyPercent.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3 text-purple-500" />
            พนักงานจ่ายแทน
          </p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {userPercent.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Donut Chart + Action Cards */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Donut Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              สัดส่วนตามประเภทผู้จ่าย
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {[
                    { label: "บริษัทจ่าย", color: PAYER_COLORS.company.bg, amount: summary?.byPayerType.company.total || 0, pct: companyPercent },
                    { label: "เงินสดย่อย", color: PAYER_COLORS.pettyCash.bg, amount: summary?.byPayerType.pettyCash.total || 0, pct: pettyCashPercent },
                    { label: "พนักงาน", color: PAYER_COLORS.user.bg, amount: summary?.byPayerType.user.total || 0, pct: userPercent },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="lg:col-span-3 space-y-4">
          {/* Petty Cash Card */}
          <Card className={
            (pettyCash?.lowBalanceCount || 0) > 0
              ? "shadow-sm border-amber-300 dark:border-amber-700"
              : "shadow-sm"
          }>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Coins className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">เงินสดย่อย</p>
                    <p className="text-xs text-muted-foreground">
                      ค่าใช้จ่าย {formatCurrency(summary?.byPayerType.pettyCash.total || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">ยอดคงเหลือ</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(pettyCash?.balance || 0)}
                  </p>
                </div>
              </div>
              {(pettyCash?.lowBalanceCount || 0) > 0 && (
                <div className="flex items-center gap-1 mt-2 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs">{pettyCash?.lowBalanceCount} กองทุนยอดต่ำ</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => router.push(`/${companyCode}/petty-cash`)}
              >
                จัดการเงินสดย่อย
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Settlement Card */}
          <Card className={
            (pendingSettlements?.total || 0) > 0
              ? "shadow-sm border-amber-300 dark:border-amber-700"
              : "shadow-sm"
          }>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">พนักงานจ่ายแทน</p>
                    <p className="text-xs text-muted-foreground">
                      ค่าใช้จ่าย {formatCurrency(summary?.byPayerType.user.total || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground">รอโอนคืน</span>
                    <span className="text-sm font-semibold text-amber-600">
                      {formatCurrency(pendingSettlements?.total || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground">โอนแล้ว</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary?.byPayerType.user.settled || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => router.push(`/${companyCode}/reimbursements`)}
              >
                จัดการโอนคืน
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Settlements by User */}
      {pendingSettlements && pendingSettlements.byUser.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-500" />
                รายการรอโอนคืนพนักงาน
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {pendingSettlements.count} รายการ
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">พนักงาน</TableHead>
                  <TableHead className="text-center text-muted-foreground">จำนวนรายการ</TableHead>
                  <TableHead className="text-right text-muted-foreground">ยอดรอโอนคืน</TableHead>
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
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-500" />
                สถานะกองทุนเงินสดย่อย
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {pettyCash.fundCount} กองทุน
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">ชื่อกองทุน</TableHead>
                  <TableHead className="text-muted-foreground">สถานะ</TableHead>
                  <TableHead className="text-right text-muted-foreground">ยอดคงเหลือ</TableHead>
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
