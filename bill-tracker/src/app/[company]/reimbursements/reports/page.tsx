"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  Users,
  Receipt,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface RankingItem {
  name: string;
  count: number;
  total: number;
}

interface TrendItem {
  month: string;
  count: number;
  total: number;
}

interface AccountBreakdown {
  account: {
    id: string;
    code: string;
    name: string;
  };
  count: number;
  total: number;
}

interface Analytics {
  stats: {
    totalCount: number;
    totalAmount: number;
    averageAmount: number;
  };
  ranking: RankingItem[];
  trends: TrendItem[];
  accountBreakdown: AccountBreakdown[];
}

export default function ReportsPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch company ID
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?code=${companyCode}`);
        const result = await response.json();
        if (result.data?.companies?.[0]) {
          setCompanyId(result.data.companies[0].id);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyCode]);

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!companyId) return;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ companyId });
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const response = await fetch(
          `/api/reimbursement-requests/analytics?${params.toString()}`
        );
        const result = await response.json();

        if (result.success) {
          setAnalytics(result.data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [companyId, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const thaiMonths = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    return `${thaiMonths[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  };

  const handleExport = () => {
    if (!analytics) return;

    // Create CSV content
    let csv = "รายงานสถิติเบิกจ่าย\n\n";
    
    csv += "สรุปภาพรวม\n";
    csv += `จำนวนครั้งทั้งหมด,${analytics.stats.totalCount}\n`;
    csv += `ยอดรวมทั้งหมด,${analytics.stats.totalAmount}\n`;
    csv += `ค่าเฉลี่ยต่อครั้ง,${analytics.stats.averageAmount}\n\n`;

    csv += "อันดับผู้ขอเบิกมากสุด\n";
    csv += "อันดับ,ชื่อ,จำนวนครั้ง,ยอดรวม\n";
    analytics.ranking.forEach((item, index) => {
      csv += `${index + 1},${item.name},${item.count},${item.total}\n`;
    });

    csv += "\nแนวโน้มรายเดือน\n";
    csv += "เดือน,จำนวนครั้ง,ยอดรวม\n";
    analytics.trends.forEach((item) => {
      csv += `${formatMonth(item.month)},${item.count},${item.total}\n`;
    });

    csv += "\nสถิติแยกตามบัญชี\n";
    csv += "รหัสบัญชี,ชื่อบัญชี,จำนวนครั้ง,ยอดรวม\n";
    analytics.accountBreakdown.forEach((item) => {
      csv += `${item.account.code},${item.account.name},${item.count},${item.total}\n`;
    });

    // Download CSV
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reimbursement-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("ส่งออกรายงานสำเร็จ");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="รายงานสถิติเบิกจ่าย"
        description="วิเคราะห์และติดตามข้อมูลการเบิกจ่าย"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={!analytics}>
              <Download className="mr-2 h-4 w-4" />
              ส่งออก CSV
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับ
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">กรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">ตั้งแต่วันที่</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">ถึงวันที่</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">จำนวนครั้งทั้งหมด</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                      {analytics.stats.totalCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">ครั้ง</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ยอดรวมทั้งหมด</p>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(analytics.stats.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">บาท</p>
                  </div>
                  <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ค่าเฉลี่ยต่อครั้ง</p>
                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(analytics.stats.averageAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">บาท</p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                อันดับผู้ขอเบิกมากสุด (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.ranking.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ไม่มีข้อมูล
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[80px]">อันดับ</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead className="text-right">จำนวนครั้ง</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.ranking.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-bold text-lg">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                แนวโน้มรายเดือน
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.trends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ไม่มีข้อมูล
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>เดือน</TableHead>
                        <TableHead className="text-right">จำนวนครั้ง</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.trends.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {formatMonth(item.month)}
                          </TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                สถิติแยกตามบัญชี
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.accountBreakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ไม่มีข้อมูล
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[120px]">รหัสบัญชี</TableHead>
                        <TableHead>ชื่อบัญชี</TableHead>
                        <TableHead className="text-right">จำนวนครั้ง</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.accountBreakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {item.account.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.account.name}
                          </TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
