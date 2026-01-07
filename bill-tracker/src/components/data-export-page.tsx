"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  FileSpreadsheet,
  FileText,
  Download,
  Cloud,
  HardDrive,
  CheckCircle2,
  Info,
  Calendar,
  Filter,
  FileJson,
  FileCode,
  TrendingDown,
  TrendingUp,
  Users,
  Package,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DataExportPageProps {
  companyId: string;
  companyName: string;
  companyCode: string;
  isOwner: boolean;
}

export function DataExportPage({ companyName }: DataExportPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ส่งออกข้อมูล</h1>
        <p className="text-muted-foreground mt-2">
          ส่งออกข้อมูลในรูปแบบต่างๆ สำหรับ {companyName}
        </p>
      </div>

      {/* Quick Export Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">รายจ่าย</p>
                <p className="text-xs text-muted-foreground mt-1">Excel / CSV</p>
              </div>
              <Badge variant="secondary" className="text-xs">เร็วๆ นี้</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">รายรับ</p>
                <p className="text-xs text-muted-foreground mt-1">Excel / CSV</p>
              </div>
              <Badge variant="secondary" className="text-xs">เร็วๆ นี้</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">ผู้ติดต่อ</p>
                <p className="text-xs text-muted-foreground mt-1">Excel / CSV</p>
              </div>
              <Badge variant="secondary" className="text-xs">เร็วๆ นี้</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">ทั้งหมด</p>
                <p className="text-xs text-muted-foreground mt-1">ZIP Archive</p>
              </div>
              <Badge variant="secondary" className="text-xs">เร็วๆ นี้</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="formats" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="formats">รูปแบบการส่งออก</TabsTrigger>
          <TabsTrigger value="backup">สำรองข้อมูล</TabsTrigger>
        </TabsList>

        {/* Formats Tab */}
        <TabsContent value="formats" className="space-y-6">
          {/* Excel Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">ส่งออก Excel</CardTitle>
                    <CardDescription>ไฟล์ .xlsx สำหรับ Microsoft Excel</CardDescription>
                  </div>
                </div>
                <Badge>แนะนำ</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ช่วงวันที่
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      เริ่มต้น
                    </Button>
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      สิ้นสุด
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    ประเภทข้อมูล
                  </Label>
                  <Button variant="outline" size="sm" disabled className="w-full justify-start">
                    เลือกข้อมูลที่ต้องการ
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">รายจ่าย + รายรับทั้งหมด</p>
                  <p className="text-xs text-muted-foreground">
                    รวมข้อมูล VAT, หัก ณ ที่จ่าย, และรายละเอียดผู้ติดต่อ
                  </p>
                </div>
                <Button disabled>
                  <Download className="h-4 w-4 mr-2" />
                  ดาวน์โหลด
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CSV Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <FileCode className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">ส่งออก CSV</CardTitle>
                  <CardDescription>ไฟล์ .csv รองรับโปรแกรมทั่วไป</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-between" disabled>
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    รายจ่าย (CSV)
                  </span>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" disabled>
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    รายรับ (CSV)
                  </span>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" disabled>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    ผู้ติดต่อ (CSV)
                  </span>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PDF Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">รายงาน PDF</CardTitle>
                  <CardDescription>รายงานสรุปพร้อมกราฟและตาราง</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">รายงานประจำเดือน</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  สรุปรายรับ-รายจ่าย พร้อมกราฟเปรียบเทียบและตารางสรุป
                </p>
              </div>
              <Button disabled className="w-full">
                <Download className="h-4 w-4 mr-2" />
                สร้างรายงาน PDF
              </Button>
            </CardContent>
          </Card>

          {/* JSON Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <FileJson className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">ส่งออก JSON</CardTitle>
                  <CardDescription>สำหรับนักพัฒนาและระบบอื่น</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  ข้อมูลแบบ JSON API สำหรับการเชื่อมต่อกับระบบอื่นหรือการพัฒนาเพิ่มเติม
                </p>
              </div>
              <Button disabled className="w-full mt-4" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                ส่งออก JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          {/* Cloud Backup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cloud Backup</CardTitle>
                  <CardDescription>สำรองข้อมูลอัตโนมัติบน Cloud</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">เปิดใช้งานอยู่</p>
                  <p className="text-sm text-muted-foreground">
                    ข้อมูลถูกสำรองอัตโนมัติทุกวันบน Supabase
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">การสำรองข้อมูลอัตโนมัติ</p>
                    <p className="text-sm text-muted-foreground">
                      • สำรองทุกวันเวลา 02:00 น.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • เก็บประวัติย้อนหลัง 30 วัน
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • เข้ารหัสข้อมูลด้วย AES-256
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">สำรองข้อมูลล่าสุด</p>
                    <p className="text-xs text-muted-foreground">วันนี้ 02:00 น.</p>
                  </div>
                  <Badge variant="secondary">สำเร็จ</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">สำรองครั้งถัดไป</p>
                    <p className="text-xs text-muted-foreground">พรุ่งนี้ 02:00 น.</p>
                  </div>
                  <Badge variant="outline">กำหนดเวลาแล้ว</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Backup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manual Backup</CardTitle>
                  <CardDescription>ดาวน์โหลดไฟล์สำรองข้อมูลเต็มรูปแบบ</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">ไฟล์สำรองข้อมูลจะรวม:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• รายรับ-รายจ่ายทั้งหมด</li>
                      <li>• ผู้ติดต่อและหมวดหมู่</li>
                      <li>• การตั้งค่าและสิทธิ์ผู้ใช้</li>
                      <li>• ไฟล์แนบ (ถ้ามี)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button disabled className="w-full">
                <Download className="h-4 w-4 mr-2" />
                ดาวน์โหลดไฟล์สำรอง (เร็วๆ นี้)
              </Button>

              <div className="rounded-lg bg-muted/30 border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  ฟีเจอร์กำลังพัฒนา - จะเปิดให้ใช้งานเร็วๆ นี้
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
