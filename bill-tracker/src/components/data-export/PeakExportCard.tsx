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
  Loader2,
  FileCheck,
  FileSpreadsheet,
  CheckCircle2,
  Info,
} from "lucide-react";
import { THAI_MONTHS } from "./types";

interface PeakStats {
  total: number;
  withAccount: number;
  withoutAccount: number;
  withWHT: number;
  warnings?: string[];
}

interface PeakExportCardProps {
  selectedMonth: number;
  selectedYear: number;
  peakStats: PeakStats | null;
  isLoadingPeakStats: boolean;
  peakError: string | null;
  isDownloadingPEAK: boolean;
  handleDownloadPEAK: () => void;
}

export function PeakExportCard({
  selectedMonth,
  selectedYear,
  peakStats,
  isLoadingPeakStats,
  peakError,
  isDownloadingPEAK,
  handleDownloadPEAK,
}: PeakExportCardProps) {
  return (
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

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {THAI_MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
                <p className="text-xs text-muted-foreground">
                  {peakStats.total} รายการ • {peakStats.withWHT} รายการมีหัก ณ
                  ที่จ่าย
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
  );
}
