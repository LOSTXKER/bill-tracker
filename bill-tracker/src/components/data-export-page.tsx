"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Cloud,
  HardDrive,
  CheckCircle2,
  Info,
  Calendar,
  TrendingDown,
  TrendingUp,
  Package,
  FolderArchive,
  Loader2,
  FileCheck,
  FileSpreadsheet,
  Database,
  FileJson,
  Users,
  FolderOpen,
  Shield,
} from "lucide-react";

interface DataExportPageProps {
  companyId: string;
  companyName: string;
  companyCode: string;
  isOwner: boolean;
}

interface ArchiveStats {
  expenseCount: number;
  incomeCount: number;
  totalExpenseFiles: number;
  totalIncomeFiles: number;
  totalExpenseAmount: number;
  totalIncomeAmount: number;
  month: number;
  year: number;
  companyCode: string;
  companyName: string;
}

interface BackupStats {
  companyCode: string;
  companyName: string;
  stats: {
    expenses: number;
    incomes: number;
    contacts: number;
    categories: number;
    users: number;
  };
  estimatedSize: string;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DataExportPage({
  companyName,
  companyCode,
  isOwner,
}: DataExportPageProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingBackupStats, setIsLoadingBackupStats] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isDownloadingPEAK, setIsDownloadingPEAK] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [peakError, setPeakError] = useState<string | null>(null);
  const [peakStats, setPeakStats] = useState<any | null>(null);
  const [isLoadingPeakStats, setIsLoadingPeakStats] = useState(false);

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from(
    { length: 3 },
    (_, i) => currentDate.getFullYear() - i
  );

  // Fetch archive stats when month/year changes
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/${companyCode}/archive?month=${selectedMonth}&year=${selectedYear}&preview=true`
        );
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลได้");
        }
        const data = await res.json();
        setArchiveStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setArchiveStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [companyCode, selectedMonth, selectedYear]);

  // Fetch PEAK stats when month/year changes
  useEffect(() => {
    const fetchPeakStats = async () => {
      setIsLoadingPeakStats(true);
      setPeakError(null);
      try {
        const res = await fetch(
          `/api/${companyCode}/export-peak?month=${selectedMonth}&year=${selectedYear}&preview=true`
        );
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลได้");
        }
        const data = await res.json();
        setPeakStats(data);
      } catch (err) {
        setPeakError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setPeakStats(null);
      } finally {
        setIsLoadingPeakStats(false);
      }
    };

    fetchPeakStats();
  }, [companyCode, selectedMonth, selectedYear]);

  // Fetch backup stats on mount (only for owners)
  useEffect(() => {
    if (!isOwner) return;

    const fetchBackupStats = async () => {
      setIsLoadingBackupStats(true);
      setBackupError(null);
      try {
        const res = await fetch(`/api/${companyCode}/backup`);
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลได้");
        }
        const data = await res.json();
        setBackupStats(data);
      } catch (err) {
        setBackupError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setBackupStats(null);
      } finally {
        setIsLoadingBackupStats(false);
      }
    };

    fetchBackupStats();
  }, [companyCode, isOwner]);

  // Handle archive download
  const handleDownloadArchive = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${companyCode}/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      // Get the blob and download
      const blob = await res.blob();
      const monthStr = String(selectedMonth).padStart(2, "0");
      const filename = `${companyCode}_${selectedYear}-${monthStr}.zip`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle backup download
  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    setBackupError(null);
    try {
      const res = await fetch(`/api/${companyCode}/backup`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      // Get the blob and download
      const blob = await res.blob();
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `backup_${companyCode}_${timestamp}.json`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  // Handle PEAK export download
  const handleDownloadPEAK = async () => {
    setIsDownloadingPEAK(true);
    setPeakError(null);
    try {
      const res = await fetch(`/api/${companyCode}/export-peak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      // Get the blob and download
      const blob = await res.blob();
      const monthStr = String(selectedMonth).padStart(2, "0");
      const filename = `PEAK_${companyCode}_${selectedYear}${monthStr}.xlsx`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setPeakError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsDownloadingPEAK(false);
    }
  };

  const totalFiles = archiveStats
    ? archiveStats.totalExpenseFiles + archiveStats.totalIncomeFiles
    : 0;
  const totalRecords = archiveStats
    ? archiveStats.expenseCount + archiveStats.incomeCount
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ส่งออกข้อมูล</h1>
        <p className="text-muted-foreground mt-2">
          ส่งออกเอกสารและข้อมูลสำหรับ {companyName}
        </p>
      </div>

      {/* Archive Export - Main Feature */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderArchive className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">ส่งออกเอกสารบัญชี</CardTitle>
                <CardDescription>
                  รวมไฟล์เอกสารและรายงาน Excel จัดโฟลเดอร์พร้อมส่งบัญชี
                </CardDescription>
              </div>
            </div>
            <Badge variant="default">ZIP Archive</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month/Year Selector */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                เดือน
              </Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THAI_MONTHS.map((month, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                ปี
              </Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year} (พ.ศ. {year + 543})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Stats Preview */}
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          ) : archiveStats ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <TrendingDown className="h-4 w-4" />
                    รายจ่าย
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {archiveStats.expenseCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {archiveStats.totalExpenseFiles} ไฟล์
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <TrendingUp className="h-4 w-4" />
                    รายรับ
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {archiveStats.incomeCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {archiveStats.totalIncomeFiles} ไฟล์
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <TrendingDown className="h-4 w-4" />
                    ยอดจ่าย
                  </div>
                  <p className="text-lg font-bold mt-1">
                    ฿{formatCurrency(archiveStats.totalExpenseAmount)}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <TrendingUp className="h-4 w-4" />
                    ยอดรับ
                  </div>
                  <p className="text-lg font-bold mt-1">
                    ฿{formatCurrency(archiveStats.totalIncomeAmount)}
                  </p>
                </div>
              </div>

              {/* Archive Contents */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  ไฟล์ ZIP จะประกอบด้วย:
                </p>
                <div className="grid gap-2 text-sm text-muted-foreground pl-6">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <span>
                      โฟลเดอร์{" "}
                      <code className="bg-muted px-1 rounded">รายจ่าย/</code> -
                      ใบกำกับภาษี, สลิปโอน, หนังสือหักภาษี
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <span>
                      โฟลเดอร์{" "}
                      <code className="bg-muted px-1 rounded">รายรับ/</code> -
                      สำเนาบิล, สลิปลูกค้า, ใบ 50 ทวิ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <span>
                      โฟลเดอร์{" "}
                      <code className="bg-muted px-1 rounded">รายงาน/</code> -
                      Excel สรุปรายจ่าย, รายรับ, VAT, WHT
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {THAI_MONTHS[selectedMonth - 1]} {selectedYear}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalRecords} รายการ • {totalFiles} ไฟล์แนบ • 4 รายงาน
                    Excel
                  </p>
                </div>
                <Button
                  onClick={handleDownloadArchive}
                  disabled={isDownloading || totalRecords === 0}
                  size="lg"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังสร้างไฟล์...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      ดาวน์โหลด ZIP
                    </>
                  )}
                </Button>
              </div>

              {totalRecords === 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4" />
                    ไม่มีข้อมูลในเดือนที่เลือก
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* PEAK Export Section */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">ส่งออกสำหรับ PEAK</CardTitle>
                <CardDescription>
                  Excel ที่พร้อม Import เข้าโปรแกรม PEAK Accounting
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              PEAK Format
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingPeakStats ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground text-sm">
                กำลังโหลด...
              </span>
            </div>
          ) : peakError ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
              {peakError}
            </div>
          ) : peakStats ? (
            <>
              {/* Stats Cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <FileCheck className="h-4 w-4" />
                    รายจ่ายทั้งหมด
                  </div>
                  <p className="text-2xl font-bold mt-1">{peakStats.total}</p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    มีรหัสบัญชีแล้ว
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {peakStats.withAccount}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <Info className="h-4 w-4" />
                    ยังไม่มีรหัสบัญชี
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {peakStats.withoutAccount}
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📋 รูปแบบไฟล์ PEAK
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 pl-4">
                  <li>• รวมรหัสบัญชี, เลขประจำตัวผู้เสียภาษี, เลขสาขา</li>
                  <li>• คำนวณ ภ.ง.ด. อัตโนมัติ (3 หรือ 53)</li>
                  <li>• รองรับภาษีซื้อและหัก ณ ที่จ่าย</li>
                  <li>• พร้อม Import เข้า PEAK ได้ทันที</li>
                </ul>
              </div>

              {/* Warnings */}
              {peakStats.warnings && peakStats.warnings.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  {peakStats.warnings.map((warning: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
                    >
                      <Info className="h-4 w-4" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {/* Download Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {THAI_MONTHS[selectedMonth - 1]} {selectedYear}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {peakStats.total} รายการ • {peakStats.withWHT} รายการมีหัก ณ ที่จ่าย
                  </p>
                </div>
                <Button
                  onClick={handleDownloadPEAK}
                  disabled={isDownloadingPEAK || peakStats.total === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isDownloadingPEAK ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังสร้างไฟล์...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      ดาวน์โหลด Excel
                    </>
                  )}
                </Button>
              </div>

              {peakStats.total === 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4" />
                    ไม่มีข้อมูลในเดือนที่เลือก
                  </div>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">ส่งออกข้อมูล Excel/CSV</CardTitle>
              <CardDescription>
                ส่งออกเฉพาะข้อมูล (ไม่รวมไฟล์แนบ)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              disabled
            >
              <TrendingDown className="h-5 w-5 text-destructive" />
              <span className="font-medium">รายจ่าย</span>
              <span className="text-xs text-muted-foreground">Excel / CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              disabled
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-medium">รายรับ</span>
              <span className="text-xs text-muted-foreground">Excel / CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              disabled
            >
              <Database className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">ผู้ติดต่อ</span>
              <span className="text-xs text-muted-foreground">Excel / CSV</span>
            </Button>
          </div>
          <div className="rounded-lg bg-muted/30 border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              ฟีเจอร์กำลังพัฒนา - ใช้ &quot;ส่งออกเอกสารบัญชี&quot; ด้านบนแทนได้
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Backup Section - Only for Owner */}
      {isOwner && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">สำรองข้อมูลทั้งหมด</CardTitle>
                  <CardDescription>
                    ดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมดของบริษัท
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <Shield className="h-3 w-3 mr-1" />
                เฉพาะเจ้าของ
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingBackupStats ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground text-sm">
                  กำลังโหลด...
                </span>
              </div>
            ) : backupError ? (
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                {backupError}
              </div>
            ) : backupStats ? (
              <>
                {/* Backup Stats */}
                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <TrendingDown className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-xl font-bold mt-1">
                      {backupStats.stats.expenses}
                    </p>
                    <p className="text-xs text-muted-foreground">รายจ่าย</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-xl font-bold mt-1">
                      {backupStats.stats.incomes}
                    </p>
                    <p className="text-xs text-muted-foreground">รายรับ</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <Users className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-xl font-bold mt-1">
                      {backupStats.stats.contacts}
                    </p>
                    <p className="text-xs text-muted-foreground">ผู้ติดต่อ</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <FolderOpen className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-xl font-bold mt-1">
                      {backupStats.stats.categories}
                    </p>
                    <p className="text-xs text-muted-foreground">บัญชี</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <Users className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-xl font-bold mt-1">
                      {backupStats.stats.users}
                    </p>
                    <p className="text-xs text-muted-foreground">ผู้ใช้</p>
                  </div>
                </div>

                {/* Backup Contents */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    ไฟล์สำรอง (JSON) จะประกอบด้วย:
                  </p>
                  <div className="grid gap-1 text-sm text-muted-foreground pl-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>ข้อมูลบริษัท และการตั้งค่า</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>รายจ่าย/รายรับ ทั้งหมด (พร้อม URL ไฟล์แนบ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>ผู้ติดต่อ และบัญชี</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>ผู้ใช้และสิทธิ์การเข้าถึง</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>AI Training Data (Vendor Mappings)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Audit Logs ล่าสุด 1,000 รายการ</span>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">ข้อมูลทั้งหมด</p>
                    <p className="text-xs text-muted-foreground">
                      ขนาดโดยประมาณ {backupStats.estimatedSize}
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadBackup}
                    disabled={isDownloadingBackup}
                    variant="outline"
                    className="border-amber-500 text-amber-600 hover:bg-amber-500/10"
                  >
                    {isDownloadingBackup ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        กำลังสร้างไฟล์...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        ดาวน์โหลด JSON
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : null}

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  ไฟล์ JSON นี้ใช้สำหรับสำรองข้อมูลและ restore ในอนาคต
                  ไม่รวมไฟล์รูปภาพ (เก็บบน Supabase Storage)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cloud Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">สถานะ Cloud</CardTitle>
              <CardDescription>ข้อมูลถูกจัดเก็บบน Supabase</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4 bg-primary/5">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">Database</p>
                <p className="text-xs text-muted-foreground">
                  Supabase PostgreSQL - Online
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-4 bg-primary/5">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">Storage</p>
                <p className="text-xs text-muted-foreground">
                  Supabase Storage - Online
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">การสำรองข้อมูลโดย Supabase</p>
                <p className="text-muted-foreground">
                  Supabase มีระบบ Point-in-Time Recovery สำหรับ Database
                  และเก็บไฟล์บน Cloud Storage อย่างปลอดภัย
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
