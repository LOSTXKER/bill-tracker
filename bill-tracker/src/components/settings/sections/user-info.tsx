"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Crown, Edit, Key } from "lucide-react";

interface CompanyAccess {
  isOwner: boolean;
  permissions: unknown;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserInfoSectionProps {
  user: UserData;
  companyAccess: CompanyAccess | null;
}

export function UserInfoSection({ user, companyAccess }: UserInfoSectionProps) {
  const roleLabels: Record<string, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    ACCOUNTANT: "บัญชี",
    STAFF: "พนักงาน",
    VIEWER: "ผู้ดู",
  };

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="gap-2">
              <Edit className="h-4 w-4" />
              แก้ไขโปรไฟล์
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                ชื่อ
              </Label>
              <Input value={user.name} disabled className="bg-muted/50" />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                อีเมล
              </Label>
              <Input value={user.email} disabled className="bg-muted/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            สิทธิ์การเข้าถึง
          </CardTitle>
          <CardDescription>
            สิทธิ์ของคุณในบริษัทนี้และในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Company Role */}
            <div className="flex items-center gap-2 rounded-full border px-4 py-2">
              {companyAccess?.isOwner ? (
                <>
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">เจ้าของบริษัท</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">สมาชิก</span>
                </>
              )}
            </div>

            {/* System Role */}
            <div className="flex items-center gap-2 rounded-full border px-4 py-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>

          {companyAccess?.isOwner && (
            <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <Crown className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm text-foreground">
                คุณเป็นเจ้าของบริษัทนี้ สามารถจัดการทุกอย่างได้รวมถึงเชิญสมาชิกใหม่
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5 text-primary" />
            ความปลอดภัย
          </CardTitle>
          <CardDescription>
            จัดการรหัสผ่านและการเข้าสู่ระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled className="gap-2">
            <Key className="h-4 w-4" />
            เปลี่ยนรหัสผ่าน (เร็วๆ นี้)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
