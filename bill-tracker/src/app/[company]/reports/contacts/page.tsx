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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  RefreshCw,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Get current year and past 3 years
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

// Thai month names
const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = parseInt(month) - 1;
  return `${thaiMonths[monthIndex]} ${parseInt(year) + 543 - 2500}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function ContactReportPage({ params }: ContactReportPageProps) {
  const { company: companyCode } = use(params);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());

  // Build API URL with filters
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

  // Prepare chart data
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">รายงานตามผู้ติดต่อ</h1>
          <p className="text-muted-foreground text-sm">
            สรุปรายรับ-รายจ่ายตาม Vendor/Customer
          </p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
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
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
                <SelectItem value="CUSTOMER">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(selectedYear !== "all" || selectedType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedYear("all");
                setSelectedType("all");
              }}
            >
              ล้างตัวกรอง
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-destructive">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
          <Button variant="link" onClick={() => mutate()}>
            ลองอีกครั้ง
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              รายจ่ายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(reportData?.summary?.totalExpenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {reportData?.summary?.expenseCount || 0} รายการ
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200/50 dark:border-green-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              รายรับรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(reportData?.summary?.totalIncomes || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {reportData?.summary?.incomeCount || 0} รายการ
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {reportData?.summary?.vendorCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">ผู้ขาย</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {reportData?.summary?.customerCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">ลูกค้า</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No Contact Warning */}
      {reportData && (reportData.summary.noContactExpenseCount > 0 || reportData.summary.noContactIncomeCount > 0) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800/50 dark:bg-yellow-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 dark:text-yellow-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                รายการที่ไม่ได้ระบุผู้ติดต่อ
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                มีรายจ่าย {reportData.summary.noContactExpenseCount} รายการ ({formatCurrency(reportData.summary.noContactExpenses)})
                และรายรับ {reportData.summary.noContactIncomeCount} รายการ ({formatCurrency(reportData.summary.noContactIncomes)})
                ที่ไม่ได้ระบุผู้ติดต่อ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts and Table Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              รายรับ-รายจ่ายรายเดือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(value) =>
                      value >= 1000
                        ? `฿${(value / 1000).toFixed(0)}k`
                        : `฿${value}`
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `฿${(value as number || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
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
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูลในช่วงเวลาที่เลือก
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Top 5 ผู้ติดต่อ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reportData?.byContact.slice(0, 5).map((contact, index) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <div>
                    <div className="text-sm font-medium truncate max-w-[150px]">
                      {contact.name}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {contact.category === "VENDOR" ? "Vendor" : "Customer"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formatCurrency(contact.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {contact.totalCount} รายการ
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && (!reportData?.byContact || reportData.byContact.length === 0) && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Breakdown Table */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            รายละเอียดตามผู้ติดต่อ ({reportData?.byContact?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reportData?.byContact && reportData.byContact.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>ผู้ติดต่อ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead className="text-right">รายจ่าย</TableHead>
                    <TableHead className="text-right">รายรับ</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.byContact.map((contact) => (
                    <Collapsible key={contact.id} asChild>
                      <>
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
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
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
