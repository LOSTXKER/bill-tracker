"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Edit, MapPin, Phone, FileText, TrendingDown, TrendingUp, Users } from "lucide-react";

interface Company {
  id: string;
  name: string;
  code: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
}

interface CompanyInfoSectionProps {
  company: Company;
}

export function CompanyInfoSection({ company }: CompanyInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* Company Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{company.name}</CardTitle>
                <CardDescription>รหัส: {company.code}</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="gap-2">
              <Edit className="h-4 w-4" />
              แก้ไข
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {/* Tax ID */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              เลขประจำตัวผู้เสียภาษี
            </Label>
            <Input value={company.taxId || "-"} disabled className="bg-muted/50" />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              โทรศัพท์
            </Label>
            <Input value={company.phone || "-"} disabled className="bg-muted/50" />
          </div>

          {/* Address - Full Width */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              ที่อยู่
            </Label>
            <Input value={company.address || "-"} disabled className="bg-muted/50" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">รายการรายจ่าย</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">รายการรายรับ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">สมาชิกทีม</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
