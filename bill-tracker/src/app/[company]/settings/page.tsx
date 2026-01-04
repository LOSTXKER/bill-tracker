import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineBotSettings } from "@/components/line-bot-settings";
import { TeamManagementCard } from "@/components/settings/team-management-card";
import {
  Building2,
  User,
  Palette,
  Database,
  Users,
  Bot,
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
        <h1 className="text-2xl font-bold text-foreground">
          ตั้งค่า
        </h1>
        <p className="text-muted-foreground">
          จัดการการตั้งค่าบริษัทและบัญชีผู้ใช้
        </p>
      </div>

      {/* Categorized Settings with Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border border-border/50"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">ข้อมูลทั่วไป</span>
            <span className="sm:hidden">ทั่วไป</span>
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border border-border/50"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">ทีมงาน</span>
            <span className="sm:hidden">ทีม</span>
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border border-border/50"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">การเชื่อมต่อ</span>
            <span className="sm:hidden">เชื่อมต่อ</span>
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 border border-border/50"
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">ข้อมูลและส่งออก</span>
            <span className="sm:hidden">ข้อมูล</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab - Company & User Info */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Company Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
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
                      className="bg-primary/10 text-primary border-primary/50"
                    >
                      {companyAccess?.isOwner ? "เจ้าของ" : "สมาชิก"}
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

            {/* Appearance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-500" />
                  รูปแบบการแสดงผล
                </CardTitle>
                <CardDescription>
                  ปรับแต่งธีมและการแสดงผล
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                    <div>
                      <p className="font-medium">ธีม</p>
                      <p className="text-sm text-muted-foreground">เลือกโหมดสว่างหรือมืด</p>
                    </div>
                    <Badge variant="outline">ระบบ</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                    <div>
                      <p className="font-medium">ภาษา</p>
                      <p className="text-sm text-muted-foreground">ภาษาที่ใช้แสดงผล</p>
                    </div>
                    <Badge variant="outline">ไทย</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <TeamManagementCard companyId={company.id} />
        </TabsContent>

        {/* Integrations Tab - LINE Bot */}
        <TabsContent value="integrations" className="space-y-6">
          <LineBotSettings companyId={company.id} companyCode={company.code} />
        </TabsContent>

        {/* Data & Export Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                ข้อมูลและการส่งออก
              </CardTitle>
              <CardDescription>
                ส่งออกข้อมูลและจัดการการสำรองข้อมูล
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Button variant="outline" disabled className="h-auto py-4 flex flex-col gap-2">
                  <Database className="h-5 w-5" />
                  <span>ส่งออก Excel</span>
                  <span className="text-xs text-muted-foreground">(เร็วๆ นี้)</span>
                </Button>
                <Button variant="outline" disabled className="h-auto py-4 flex flex-col gap-2">
                  <Database className="h-5 w-5" />
                  <span>ส่งออก PDF</span>
                  <span className="text-xs text-muted-foreground">(เร็วๆ นี้)</span>
                </Button>
                <Button variant="outline" disabled className="h-auto py-4 flex flex-col gap-2">
                  <Database className="h-5 w-5" />
                  <span>สำรองข้อมูล</span>
                  <span className="text-xs text-muted-foreground">(เร็วๆ นี้)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
