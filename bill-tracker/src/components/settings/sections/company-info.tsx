"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Phone, FileText, Briefcase, Loader2, Check, Pencil, X } from "lucide-react";
import { SettingsCard, SettingsField } from "../SettingsCard";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
  legalName: string | null;
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
  const router = useRouter();
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: company.name,
    legalName: company.legalName || "",
    taxId: company.taxId || "",
    phone: company.phone || "",
    address: company.address || "",
  });
  
  // Business description (separate section)
  const [businessDescription, setBusinessDescription] = useState(company.businessDescription || "");
  const [hasDescriptionChanges, setHasDescriptionChanges] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setBusinessDescription(value);
    setHasDescriptionChanges(value !== (company.businessDescription || ""));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      name: company.name,
      legalName: company.legalName || "",
      taxId: company.taxId || "",
      phone: company.phone || "",
      address: company.address || "",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: company.name,
      legalName: company.legalName || "",
      taxId: company.taxId || "",
      phone: company.phone || "",
      address: company.address || "",
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อที่แสดง");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          legalName: formData.legalName.trim() || null,
          taxId: formData.taxId.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success("บันทึกข้อมูลบริษัทเรียบร้อย");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("ไม่สามารถบันทึกได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDescription }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success("บันทึกข้อมูลธุรกิจเรียบร้อย");
      setHasDescriptionChanges(false);
    } catch {
      toast.error("ไม่สามารถบันทึกได้");
    } finally {
      setIsSavingDescription(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title={isEditing ? "แก้ไขข้อมูลบริษัท" : company.name}
        description={`รหัส: ${company.code}`}
        icon={Building2}
        customAction={
          isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                ยกเลิก
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                บันทึก
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              แก้ไข
            </Button>
          )
        }
        contentClassName="grid gap-6 sm:grid-cols-2"
      >
        {isEditing ? (
          <>
            <SettingsField label="ชื่อที่แสดง" icon={Building2}>
              <Input 
                value={formData.name} 
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="ชื่อที่แสดงในระบบ"
              />
              <p className="text-xs text-muted-foreground mt-1">ชื่อที่แสดงใน UI ของระบบ</p>
            </SettingsField>

            <SettingsField label="ชื่อทางการ (Legal Name)" icon={FileText}>
              <Input 
                value={formData.legalName} 
                onChange={(e) => handleInputChange("legalName", e.target.value)}
                placeholder="ชื่อที่ใช้ในเอกสาร/ใบกำกับภาษี"
              />
              <p className="text-xs text-muted-foreground mt-1">AI ใช้ระบุตัวตนบริษัทจากเอกสาร</p>
            </SettingsField>

            <SettingsField label="เลขประจำตัวผู้เสียภาษี" icon={FileText}>
              <Input 
                value={formData.taxId} 
                onChange={(e) => handleInputChange("taxId", e.target.value)}
                placeholder="เลขประจำตัวผู้เสียภาษี"
              />
            </SettingsField>

            <SettingsField label="โทรศัพท์" icon={Phone}>
              <Input 
                value={formData.phone} 
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="เบอร์โทรศัพท์"
              />
            </SettingsField>

            <SettingsField label="ที่อยู่" icon={MapPin} fullWidth>
              <Textarea 
                value={formData.address} 
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="ที่อยู่บริษัท"
                className="min-h-[80px]"
              />
            </SettingsField>
          </>
        ) : (
          <>
            <SettingsField label="ชื่อทางการ (Legal Name)" icon={FileText}>
              <Input value={company.legalName || "-"} disabled className="bg-muted/50" />
            </SettingsField>

            <SettingsField label="เลขประจำตัวผู้เสียภาษี" icon={FileText}>
              <Input value={company.taxId || "-"} disabled className="bg-muted/50" />
            </SettingsField>

            <SettingsField label="โทรศัพท์" icon={Phone}>
              <Input value={company.phone || "-"} disabled className="bg-muted/50" />
            </SettingsField>

            <SettingsField label="ที่อยู่" icon={MapPin} fullWidth>
              <Input value={company.address || "-"} disabled className="bg-muted/50" />
            </SettingsField>
          </>
        )}
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
            {hasDescriptionChanges && (
              <Button onClick={handleSaveDescription} disabled={isSavingDescription} size="sm">
                {isSavingDescription ? (
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
