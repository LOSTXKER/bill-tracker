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
  Info,
} from "lucide-react";

export function DataExportCard() {
  return (
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
            ฟีเจอร์กำลังพัฒนา - ใช้ &quot;ส่งออกเอกสารบัญชี&quot;
            ด้านบนแทนได้
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
