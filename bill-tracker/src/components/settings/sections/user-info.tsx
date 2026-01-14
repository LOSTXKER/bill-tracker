"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Crown, Key } from "lucide-react";
import { SettingsCard, SettingsField } from "../SettingsCard";

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

const roleLabels: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  ACCOUNTANT: "บัญชี",
  STAFF: "พนักงาน",
  VIEWER: "ผู้ดู",
};

export function UserInfoSection({ user, companyAccess }: UserInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <SettingsCard
        title={user.name}
        description={user.email}
        customAction={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
        }
        showEditButton
        editDisabled
        editLabel="แก้ไขโปรไฟล์"
        contentClassName="grid gap-4 sm:grid-cols-2"
      >
        <SettingsField label="ชื่อ" icon={User}>
          <Input value={user.name} disabled className="bg-muted/50" />
        </SettingsField>

        <SettingsField label="อีเมล" icon={Mail}>
          <Input value={user.email} disabled className="bg-muted/50" />
        </SettingsField>
      </SettingsCard>

      {/* Permissions Card */}
      <SettingsCard
        title="สิทธิ์การเข้าถึง"
        description="สิทธิ์ของคุณในบริษัทนี้และในระบบ"
        icon={Shield}
      >
        <div className="space-y-4">
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
        </div>
      </SettingsCard>

      {/* Security Card */}
      <SettingsCard
        title="ความปลอดภัย"
        description="จัดการรหัสผ่านและการเข้าสู่ระบบ"
        icon={Key}
      >
        <Button variant="outline" disabled className="gap-2">
          <Key className="h-4 w-4" />
          เปลี่ยนรหัสผ่าน (เร็วๆ นี้)
        </Button>
      </SettingsCard>
    </div>
  );
}
