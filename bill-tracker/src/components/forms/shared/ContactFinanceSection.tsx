"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Lightbulb, Plus, Trash2 } from "lucide-react";
import { WHT_TYPE_OPTIONS, WHT_RATE_BY_TYPE } from "@/lib/constants/transaction";
import { AccountSelector } from "@/components/forms/shared/account-selector";
import type { ContactFormSectionProps, DescriptionPreset } from "./contact-form-types";

function getFilterClass(category: string): string | undefined {
  if (category === "VENDOR") return "EXPENSE";
  if (category === "CUSTOMER") return "REVENUE";
  return undefined;
}

export function ContactFinanceSection({ formData, setFormData, companyCode }: ContactFormSectionProps) {
  const filterClass = getFilterClass(formData.contactCategory);

  const updatePreset = (index: number, field: keyof DescriptionPreset, value: string) => {
    const updated = [...formData.descriptionPresets];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, descriptionPresets: updated });
  };

  const addPreset = () => {
    setFormData({
      ...formData,
      descriptionPresets: [
        ...formData.descriptionPresets,
        { label: "", description: "", accountId: "" },
      ],
    });
  };

  const removePreset = (index: number) => {
    setFormData({
      ...formData,
      descriptionPresets: formData.descriptionPresets.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      {/* Banking & Credit */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">ข้อมูลการเงิน</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-bankName">ธนาคาร</Label>
            <Input
              id="contact-bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="เช่น กสิกรไทย"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-bankAccount">เลขบัญชี</Label>
            <Input
              id="contact-bankAccount"
              value={formData.bankAccount}
              onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
              placeholder="xxx-x-xxxxx-x"
              className="h-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-creditLimit">วงเงินเครดิต</Label>
            <Input
              id="contact-creditLimit"
              type="number"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              placeholder="0"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-paymentTerms">เครดิต (วัน)</Label>
            <Input
              id="contact-paymentTerms"
              type="number"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="30"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Transaction Defaults */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="font-medium text-sm">ค่าเริ่มต้นสำหรับธุรกรรม</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          ค่าเหล่านี้จะแสดงเป็นคำแนะนำเมื่อเลือกผู้ติดต่อนี้ในฟอร์มรายจ่าย/รายรับ
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-defaultVatRate">อัตรา VAT เริ่มต้น</Label>
            <Select
              value={formData.defaultVatRate || "__NONE__"}
              onValueChange={(value) => setFormData({ ...formData, defaultVatRate: value === "__NONE__" ? "" : value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="ไม่ระบุ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">ไม่ระบุ</SelectItem>
                <SelectItem value="0">0% (ไม่มี VAT)</SelectItem>
                <SelectItem value="7">7%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>บัญชีเริ่มต้น</Label>
            {companyCode ? (
              <AccountSelector
                value={formData.defaultAccountId || null}
                onValueChange={(val) => setFormData({ ...formData, defaultAccountId: val || "" })}
                companyCode={companyCode}
                placeholder="เลือกบัญชีเริ่มต้น..."
                filterClass={filterClass}
              />
            ) : (
              <Input disabled placeholder="บันทึกผู้ติดต่อก่อนจึงเลือกบัญชีได้" className="h-10" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              id="contact-defaultWhtEnabled"
              checked={formData.defaultWhtEnabled}
              onCheckedChange={(checked) => {
                setFormData({
                  ...formData,
                  defaultWhtEnabled: checked,
                  defaultWhtType: checked && !formData.defaultWhtType ? "SERVICE" : formData.defaultWhtType,
                  defaultWhtRate: checked && !formData.defaultWhtRate ? "3" : formData.defaultWhtRate,
                });
              }}
            />
            <Label htmlFor="contact-defaultWhtEnabled" className="cursor-pointer">
              หัก ณ ที่จ่ายเป็นค่าเริ่มต้น
            </Label>
          </div>

          {formData.defaultWhtEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-10">
              <div className="space-y-2">
                <Label htmlFor="contact-defaultWhtType">ประเภท WHT</Label>
                <Select
                  value={formData.defaultWhtType}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      defaultWhtType: value,
                      defaultWhtRate: WHT_RATE_BY_TYPE[value]?.toString() || formData.defaultWhtRate,
                    });
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    {WHT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-defaultWhtRate">อัตรา WHT (%)</Label>
                <Input
                  id="contact-defaultWhtRate"
                  type="number"
                  value={formData.defaultWhtRate}
                  onChange={(e) => setFormData({ ...formData, defaultWhtRate: e.target.value })}
                  placeholder="3"
                  className="h-10"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Description Presets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">รายการบันทึกที่ใช้บ่อย</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              สร้างรายการไว้ล่วงหน้า เวลาบันทึกธุรกรรมจะเลือกจาก dropdown ได้เลย
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addPreset}>
            <Plus className="h-3 w-3" />
            เพิ่มรายการ
          </Button>
        </div>

        {formData.descriptionPresets.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
            ยังไม่มีรายการบันทึก กด &ldquo;เพิ่มรายการ&rdquo; เพื่อสร้าง
          </div>
        ) : (
          <div className="space-y-3">
            {formData.descriptionPresets.map((preset, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removePreset(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div className="space-y-1.5">
                    <Label className="text-xs">ชื่อย่อ</Label>
                    <Input
                      value={preset.label}
                      onChange={(e) => updatePreset(index, "label", e.target.value)}
                      placeholder="เช่น ค่าบริการรายเดือน"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">บัญชี (ถ้าต่างจากค่าเริ่มต้น)</Label>
                    {companyCode ? (
                      <AccountSelector
                        value={preset.accountId || null}
                        onValueChange={(val) => updatePreset(index, "accountId", val || "")}
                        companyCode={companyCode}
                        placeholder="ใช้บัญชีเริ่มต้น"
                        filterClass={filterClass}
                      />
                    ) : (
                      <Input disabled placeholder="—" className="h-9 text-sm" />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">คำอธิบายเต็ม</Label>
                  <Input
                    value={preset.description}
                    onChange={(e) => updatePreset(index, "description", e.target.value)}
                    placeholder="เช่น ค่าบริการที่ปรึกษาประจำเดือน ม.ค. 2569"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
