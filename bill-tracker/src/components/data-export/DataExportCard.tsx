"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Database,
  Loader2,
} from "lucide-react";
import type { DownloadingDataType } from "./use-data-export";
import { THAI_MONTHS } from "./types";

interface DataExportCardProps {
  companyCode: string;
  selectedMonth: number;
  selectedYear: number;
  downloadingDataType: DownloadingDataType;
  dataExportError: string | null;
  handleDownloadData: (type: "expenses" | "incomes" | "contacts") => void;
}

export function DataExportCard({
  selectedMonth,
  selectedYear,
  downloadingDataType,
  dataExportError,
  handleDownloadData,
}: DataExportCardProps) {
  const buttons = [
    {
      type: "expenses" as const,
      icon: TrendingDown,
      label: "รายจ่าย",
      iconColor: "text-destructive",
    },
    {
      type: "incomes" as const,
      icon: TrendingUp,
      label: "รายรับ",
      iconColor: "text-primary",
    },
    {
      type: "contacts" as const,
      icon: Database,
      label: "ผู้ติดต่อ",
      iconColor: "text-muted-foreground",
    },
  ];

  return (
    <Card className="shadow-card border-border/50 bg-gradient-to-br from-green-500/5 via-transparent to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg">ส่งออกข้อมูล Excel</CardTitle>
            <CardDescription>
              ส่งออกเฉพาะข้อมูล (ไม่รวมไฟล์แนบ)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {THAI_MONTHS[selectedMonth - 1]} {selectedYear} (ผู้ติดต่อไม่ขึ้นกับเดือน/ปี)
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {buttons.map(({ type, icon: Icon, label, iconColor }) => {
            const isLoading = downloadingDataType === type;
            const isDisabled = downloadingDataType !== null;

            return (
              <Button
                key={type}
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                disabled={isDisabled}
                onClick={() => handleDownloadData(type)}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                )}
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {isLoading ? "กำลังดาวน์โหลด..." : "Excel (.xlsx)"}
                </span>
              </Button>
            );
          })}
        </div>

        {dataExportError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
            {dataExportError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
