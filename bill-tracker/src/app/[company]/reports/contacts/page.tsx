"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Users,
  UserSearch,
  TrendingUp,
  TrendingDown,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHeader } from "@/components/shared/PageHeader";
import { fetcher } from "@/lib/utils/fetcher";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/tax-calculator";

function BarChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
      <p className="font-medium text-card-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-card-foreground">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ContactReportPageProps {
  params: Promise<{ company: string }>;
}

interface ContactData {
  id: string;
  name: string;
  category: "VENDOR" | "CUSTOMER";
  taxId: string | null;
  expense: {
    amount: number;
    netPaid: number;
    vatAmount: number;
    whtAmount: number;
    count: number;
  };
  income: {
    amount: number;
    netReceived: number;
    vatAmount: number;
    whtAmount: number;
    count: number;
  };
  total: number;
  totalCount: number;
}

interface ReportData {
  summary: {
    totalExpenses: number;
    expenseCount: number;
    totalIncomes: number;
    incomeCount: number;
    contactCount: number;
    vendorCount: number;
    customerCount: number;
    noContactExpenses: number;
    noContactExpenseCount: number;
    noContactIncomes: number;
    noContactIncomeCount: number;
  };
  byContact: ContactData[];
  byMonth: Array<{
    month: string;
    expenses: number;
    expenseCount: number;
    incomes: number;
    incomeCount: number;
  }>;
}

const thisYear = new Date().getFullYear();
const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = parseInt(month) - 1;
  return `${thaiMonths[monthIndex]} ${parseInt(year) + 543 - 2500}`;
}

export default function ContactReportPage({ params }: ContactReportPageProps) {
  const { company: companyCode } = use(params);
  const [selectedYear, setSelectedYear] = useState<string>(thisYear.toString());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());

  const buildApiUrl = () => {
    const params = new URLSearchParams();
    if (selectedYear && selectedYear !== "all") {
      params.set("dateFrom", `${selectedYear}-01-01`);
      params.set("dateTo", `${selectedYear}-12-31`);
    }
    if (selectedType && selectedType !== "all") {
      params.set("type", selectedType);
    }
    return `/api/${companyCode}/contacts/report?${params.toString()}`;
  };

  const { data, error, isLoading, mutate } = useSWR<{ data: ReportData }>(
    buildApiUrl(),
    fetcher,
    { revalidateOnFocus: false }
  );

  const reportData = data?.data;
  const summary = reportData?.summary;

  const chartData = reportData?.byMonth
    .slice()
    .reverse()
    .slice(-12)
    .map((item) => ({
      month: formatMonthLabel(item.month),
      รายจ่าย: item.expenses,
      รายรับ: item.incomes,
    })) || [];

  const toggleExpand = (contactId: string) => {
    const newExpanded = new Set(expandedContacts);
    if (newExpanded.has(contactId)) {
      newExpanded.delete(contactId);
    } else {
      newExpanded.add(contactId);
    }
    setExpandedContacts(newExpanded);
  };

  // Loading skeleton
  if (isLoading && !reportData) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="รายงานตามผู้ติดต่อ"
        description="สรุปรายรับ-รายจ่ายตาม Vendor/Customer"
        icon={UserSearch}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue placeholder="เลือกปี" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year + 543}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="ประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="VENDOR">Vendor</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
          </SelectContent>
        </Select>

        {(selectedYear !== "all" || selectedType !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSelectedYear("all");
              setSelectedType("all");
            }}
          >
            ล้างตัวกรอง
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => mutate()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Error State */}
      {error && (
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
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-red-500" />
            รายจ่ายรวม
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">
            {formatCurrency(summary?.totalExpenses || 0)}
          </p>
          <p className="text-xs text-muted-foreground">{summary?.expenseCount || 0} รายการ</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-emerald-500" />
            รายรับรวม
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(summary?.totalIncomes || 0)}
          </p>
          <p className="text-xs text-muted-foreground">{summary?.incomeCount || 0} รายการ</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Vendor
          </p>
          <p className="text-xl font-bold mt-0.5">
            {summary?.vendorCount || 0} <span className="text-sm font-normal text-muted-foreground">ผู้ขาย</span>
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            Customer
          </p>
          <p className="text-xl font-bold mt-0.5">
            {summary?.customerCount || 0} <span className="text-sm font-normal text-muted-foreground">ลูกค้า</span>
          </p>
        </div>
      </div>

      {/* No Contact Warning */}
      {reportData && (reportData.summary.noContactExpenseCount > 0 || reportData.summary.noContactIncomeCount > 0) && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium text-amber-800 dark:text-amber-200">รายการที่ไม่ได้ระบุผู้ติดต่อ</span>
            <span className="text-amber-700 dark:text-amber-300 ml-1">
              — มีรายจ่าย {reportData.summary.noContactExpenseCount} รายการ ({formatCurrency(reportData.summary.noContactExpenses)})
              และรายรับ {reportData.summary.noContactIncomeCount} รายการ ({formatCurrency(reportData.summary.noContactIncomes)})
              ที่ไม่ได้ระบุผู้ติดต่อ
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Monthly Chart — full width */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            รายรับ-รายจ่ายรายเดือน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={formatCurrencyCompact}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<BarChartTooltip />} cursor={{ fill: "var(--muted-foreground)", opacity: 0.08 }} />
                <Legend />
                <Bar
                  dataKey="รายจ่าย"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="รายรับ"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              ไม่มีข้อมูลในช่วงเวลาที่เลือก
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            รายละเอียดตามผู้ติดต่อ ({reportData?.byContact?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData?.byContact && reportData.byContact.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px] text-muted-foreground"></TableHead>
                    <TableHead className="text-muted-foreground">ผู้ติดต่อ</TableHead>
                    <TableHead className="text-muted-foreground">ประเภท</TableHead>
                    <TableHead className="text-right text-muted-foreground">รายจ่าย</TableHead>
                    <TableHead className="text-right text-muted-foreground">รายรับ</TableHead>
                    <TableHead className="text-right text-muted-foreground">รวม</TableHead>
                    <TableHead className="text-center text-muted-foreground">จำนวน</TableHead>
                    <TableHead className="w-[100px] text-muted-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                {reportData.byContact.map((contact) => (
                  <Collapsible key={contact.id} asChild>
                    <tbody>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(contact.id)}
                            >
                              {expandedContacts.has(contact.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{contact.name}</div>
                          {contact.taxId && (
                            <div className="text-xs text-muted-foreground">
                              เลขผู้เสียภาษี: {contact.taxId}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              contact.category === "VENDOR"
                                ? "border-red-200 text-red-600"
                                : "border-green-200 text-green-600"
                            }
                          >
                            {contact.category === "VENDOR" ? "Vendor" : "Customer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {contact.expense.count > 0
                            ? formatCurrency(contact.expense.netPaid)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {contact.income.count > 0
                            ? formatCurrency(contact.income.netReceived)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(contact.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          {contact.totalCount}
                        </TableCell>
                        <TableCell>
                          <Link href={`/${companyCode}/contacts/${contact.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              ดู
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={8} className="py-4">
                            <div className="grid grid-cols-2 gap-6 px-4">
                              <div>
                                <h4 className="text-sm font-semibold text-red-600 mb-2">
                                  รายละเอียดรายจ่าย
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">ยอดรวม:</span>
                                    <span>{formatCurrency(contact.expense.amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">VAT:</span>
                                    <span>{formatCurrency(contact.expense.vatAmount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">หัก ณ ที่จ่าย:</span>
                                    <span>{formatCurrency(contact.expense.whtAmount)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold pt-1 border-t">
                                    <span>จ่ายสุทธิ:</span>
                                    <span>{formatCurrency(contact.expense.netPaid)}</span>
                                  </div>
                                </div>
                                {contact.expense.count > 0 && (
                                  <Link href={`/${companyCode}/expenses?contactId=${contact.id}`}>
                                    <Button variant="outline" size="sm" className="mt-3 gap-1">
                                      ดูรายจ่ายทั้งหมด
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-green-600 mb-2">
                                  รายละเอียดรายรับ
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">ยอดรวม:</span>
                                    <span>{formatCurrency(contact.income.amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">VAT:</span>
                                    <span>{formatCurrency(contact.income.vatAmount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">โดนหัก ณ ที่จ่าย:</span>
                                    <span>{formatCurrency(contact.income.whtAmount)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold pt-1 border-t">
                                    <span>รับสุทธิ:</span>
                                    <span>{formatCurrency(contact.income.netReceived)}</span>
                                  </div>
                                </div>
                                {contact.income.count > 0 && (
                                  <Link href={`/${companyCode}/incomes?contactId=${contact.id}`}>
                                    <Button variant="outline" size="sm" className="mt-3 gap-1">
                                      ดูรายรับทั้งหมด
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </tbody>
                  </Collapsible>
                ))}
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              ไม่มีข้อมูลผู้ติดต่อในช่วงเวลาที่เลือก
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
