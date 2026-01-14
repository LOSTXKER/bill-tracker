"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Phone, FileText, Briefcase, Loader2, Check } from "lucide-react";
import { SettingsCard, SettingsField } from "../SettingsCard";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  code: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  businessDescription: string | null;
}

interface CompanyInfoSectionProps {
  company: Company;
}

export function CompanyInfoSection({ company }: CompanyInfoSectionProps) {
  const [businessDescription, setBusinessDescription] = useState(company.businessDescription || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDescriptionChange = (value: string) => {
    setBusinessDescription(value);
    setHasChanges(value !== (company.businessDescription || ""));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDescription }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success("บันทึกข้อมูลธุรกิจเรียบร้อย");
      setHasChanges(false);
    } catch {
      toast.error("ไม่สามารถบันทึกได้");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title={company.name}
        description={`รหัส: ${company.code}`}
        icon={Building2}
        showEditButton
        editDisabled
        contentClassName="grid gap-6 sm:grid-cols-2"
      >
        <SettingsField label="เลขประจำตัวผู้เสียภาษี" icon={FileText}>
          <Input value={company.taxId || "-"} disabled className="bg-muted/50" />
        </SettingsField>

        <SettingsField label="โทรศัพท์" icon={Phone}>
          <Input value={company.phone || "-"} disabled className="bg-muted/50" />
        </SettingsField>

        <SettingsField label="ที่อยู่" icon={MapPin} fullWidth>
          <Input value={company.address || "-"} disabled className="bg-muted/50" />
        </SettingsField>
      </SettingsCard>

      {/* Business Description for AI */}
      <SettingsCard
        title="ประเภทธุรกิจ"
        description="อธิบายธุรกิจของคุณ เพื่อให้ AI แนะนำบัญชีได้แม่นยำขึ้น"
        icon={Briefcase}
      >
        <div className="space-y-4">
          <Textarea
            placeholder="เช่น: บริษัทพัฒนาซอฟต์แวร์, ร้านขายเสื้อผ้าออนไลน์, บริษัทให้บริการที่ปรึกษา, ร้านอาหาร..."
            value={businessDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              AI จะใช้ข้อมูลนี้ตัดสินใจว่ารายการซื้อเป็นค่าใช้จ่ายหรือสินค้าสำหรับขาย
            </p>
            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                บันทึก
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
