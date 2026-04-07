"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  TrendingDown,
  TrendingUp,
  Package,
  FolderArchive,
  Loader2,
  FileCheck,
  Info,
} from "lucide-react";
import { ArchiveStats, THAI_MONTHS } from "./types";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface ArchiveExportCardProps {
  selectedMonth: number;
  selectedYear: number;
  archiveStats: ArchiveStats | null;
  isLoadingStats: boolean;
  error: string | null;
  isDownloading: boolean;
  handleDownloadArchive: () => void;
  totalFiles: number;
  totalRecords: number;
}

export function ArchiveExportCard({
  selectedMonth,
  selectedYear,
  archiveStats,
  isLoadingStats,
  error,
  isDownloading,
  handleDownloadArchive,
  totalFiles,
  totalRecords,
}: ArchiveExportCardProps) {
  return (
    <Card className="shadow-card border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
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
                  {formatCurrency(archiveStats.totalExpenseAmount)}
                </p>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-primary text-sm">
                  <TrendingUp className="h-4 w-4" />
                  ยอดรับ
                </div>
                <p className="text-lg font-bold mt-1">
                  {formatCurrency(archiveStats.totalIncomeAmount)}
                </p>
              </div>
            </div>

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

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {THAI_MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalRecords} รายการ • {totalFiles} ไฟล์แนบ • 4 รายงาน Excel
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
  );
}
