import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineBotSettings } from "@/components/line-bot-settings";
import {
  Building2,
  User,
  Shield,
  Bell,
  Palette,
  Database,
} from "lucide-react";

interface SettingsPageProps {
  params: Promise<{ company: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { company: companyCode } = await params;
  const session = await auth();

  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  // Get user's role in this company
  const companyAccess = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: session?.user?.id || "",
        companyId: company.id,
      },
    },
  });

  const roleLabels: Record<string, string> = {
    OWNER: "เจ้าของ",
    MANAGER: "ผู้จัดการ",
    ACCOUNTANT: "บัญชี",
    VIEWER: "ผู้ดู",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          ตั้งค่า
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          จัดการการตั้งค่าบริษัทและบัญชีผู้ใช้
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              ข้อมูลบริษัท
            </CardTitle>
            <CardDescription>
              รายละเอียดและการตั้งค่าบริษัท
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อบริษัท</Label>
              <Input value={company.name} disabled />
            </div>
            <div className="space-y-2">
              <Label>รหัสบริษัท</Label>
              <Input value={company.code} disabled />
            </div>
            <div className="space-y-2">
              <Label>เลขประจำตัวผู้เสียภาษี</Label>
              <Input value={company.taxId || "-"} disabled />
            </div>
            <div className="space-y-2">
              <Label>โทรศัพท์</Label>
              <Input value={company.phone || "-"} disabled />
            </div>
            <div className="space-y-2">
              <Label>ที่อยู่</Label>
              <Input value={company.address || "-"} disabled />
            </div>
            <Separator />
            <Button variant="outline" className="w-full" disabled>
              แก้ไขข้อมูลบริษัท (เร็วๆ นี้)
            </Button>
          </CardContent>
        </Card>

        {/* User Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              ข้อมูลผู้ใช้
            </CardTitle>
            <CardDescription>
              ข้อมูลบัญชีและสิทธิ์การเข้าถึง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อ</Label>
              <Input value={session?.user?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input value={session?.user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>สิทธิ์ในบริษัทนี้</Label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  {roleLabels[companyAccess?.role || ""] || companyAccess?.role || "ไม่ระบุ"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>สิทธิ์ระบบ</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {session?.user?.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้ทั่วไป"}
                </Badge>
              </div>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" disabled>
              แก้ไขข้อมูลผู้ใช้ (เร็วๆ นี้)
            </Button>
          </CardContent>
        </Card>

        {/* LINE Bot Configuration */}
        <LineBotSettings companyId={company.id} companyCode={company.code} />

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              รูปแบบการแสดงผล
            </CardTitle>
            <CardDescription>
              ปรับแต่งธีมและการแสดงผล
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">ธีม</p>
                <p className="text-sm text-slate-500">เลือกโหมดสว่างหรือมืด</p>
              </div>
              <Badge variant="outline">ระบบ</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">ภาษา</p>
                <p className="text-sm text-slate-500">ภาษาที่ใช้แสดงผล</p>
              </div>
              <Badge variant="outline">ไทย</Badge>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" disabled>
              ตั้งค่าการแสดงผล (เร็วๆ นี้)
            </Button>
          </CardContent>
        </Card>

        {/* Data & Export */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-500" />
              ข้อมูลและการส่งออก
            </CardTitle>
            <CardDescription>
              ส่งออกข้อมูลและจัดการการสำรองข้อมูล
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <Button variant="outline" disabled>
                ส่งออก Excel (เร็วๆ นี้)
              </Button>
              <Button variant="outline" disabled>
                ส่งออก PDF (เร็วๆ นี้)
              </Button>
              <Button variant="outline" disabled>
                สำรองข้อมูล (เร็วๆ นี้)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
