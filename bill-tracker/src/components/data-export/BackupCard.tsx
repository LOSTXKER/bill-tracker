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
  HardDrive,
  TrendingDown,
  TrendingUp,
  Loader2,
  CheckCircle2,
  FileJson,
  Users,
  FolderOpen,
  Shield,
  Info,
} from "lucide-react";
import { BackupStats } from "./types";

interface BackupCardProps {
  backupStats: BackupStats | null;
  isLoadingBackupStats: boolean;
  backupError: string | null;
  isDownloadingBackup: boolean;
  handleDownloadBackup: () => void;
}

export function BackupCard({
  backupStats,
  isLoadingBackupStats,
  backupError,
  isDownloadingBackup,
  handleDownloadBackup,
}: BackupCardProps) {
  return (
    <Card className="shadow-card border-border/50 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
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
                  {backupStats.stats.accounts}
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
  );
}
