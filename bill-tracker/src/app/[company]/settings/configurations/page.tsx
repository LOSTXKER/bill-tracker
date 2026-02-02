/**
 * Company Configuration Management Page (Phase 7.3)
 * Allows administrators to manage company-specific settings
 */

import { Metadata } from "next";
import { requireOwner } from "@/lib/permissions/checker";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ตั้งค่าระบบ | Configuration",
  description: "จัดการการตั้งค่าเฉพาะบริษัท",
};

interface PageProps {
  params: { company: string };
}

export default async function ConfigurationsPage({ params }: PageProps) {
  const user = await requireOwner(params.company.toUpperCase());
  
  const company = await prisma.company.findUnique({
    where: { code: params.company.toUpperCase() },
    // Note: CompanyConfig relation will be available after running prisma generate
    // include: { CompanyConfig: true },
  });

  if (!company) {
    return <div>ไม่พบข้อมูลบริษัท</div>;
  }

  // TODO: Fetch CompanyConfig after Prisma migration
  const configs: any[] = [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ตั้งค่าระบบ</h1>
        <p className="text-muted-foreground mt-2">
          จัดการการตั้งค่าเฉพาะของบริษัท เช่น อัตราภาษีหัก ณ ที่จ่าย, วิธีการชำระเงิน, สถานะเวิร์กโฟลว์
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* WHT Rates Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>อัตราภาษีหัก ณ ที่จ่าย</CardTitle>
            <CardDescription>
              กำหนดอัตราภาษีหัก ณ ที่จ่ายตามประเภทรายจ่าย
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              การตั้งค่าจะพร้อมใช้งานในเวอร์ชันถัดไป
            </p>
            {/* Future: WHT rates configuration form */}
          </CardContent>
        </Card>

        {/* Payment Methods Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>วิธีการชำระเงิน</CardTitle>
            <CardDescription>
              กำหนดช่องทางการชำระเงินที่ใช้ในบริษัท
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              การตั้งค่าจะพร้อมใช้งานในเวอร์ชันถัดไป
            </p>
            {/* Future: Payment methods configuration form */}
          </CardContent>
        </Card>

        {/* Document Types Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>ประเภทเอกสาร</CardTitle>
            <CardDescription>
              กำหนดประเภทเอกสารที่ใช้ในการบันทึกรายรับ-รายจ่าย
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              การตั้งค่าจะพร้อมใช้งานในเวอร์ชันถัดไป
            </p>
            {/* Future: Document types configuration form */}
          </CardContent>
        </Card>

        {/* Workflow Statuses Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>สถานะเวิร์กโฟลว์</CardTitle>
            <CardDescription>
              ปรับแต่งขั้นตอนการอนุมัติและสถานะของเอกสาร
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              การตั้งค่าจะพร้อมใช้งานในเวอร์ชันถัดไป
            </p>
            {/* Future: Workflow statuses configuration form */}
          </CardContent>
        </Card>
      </div>

      {/* Current Configurations Display */}
      {configs && configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>การตั้งค่าปัจจุบัน</CardTitle>
            <CardDescription>
              แสดงการตั้งค่าที่มีอยู่ในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{config.key}</p>
                    <p className="text-sm text-muted-foreground">
                      อัปเดตล่าสุด: {new Date(config.updatedAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
