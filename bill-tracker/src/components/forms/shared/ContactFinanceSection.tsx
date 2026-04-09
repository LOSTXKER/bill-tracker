"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronDown, Layers } from "lucide-react";
import { WHT_TYPE_OPTIONS, WHT_RATE_BY_TYPE } from "@/lib/constants/transaction";
import { AccountSelector } from "@/components/forms/shared/account-selector";
import { CategorySelector } from "@/components/forms/shared/CategorySelector";
import { cn } from "@/lib/utils";
import { EMPTY_PRESET, type ContactFormSectionProps, type TransactionPreset } from "./contact-form-types";

function getFilterClass(category: string): string | undefined {
  if (category === "VENDOR") return "EXPENSE";
  if (category === "CUSTOMER") return "REVENUE";
  return undefined;
}

function getCategoryType(category: string): "EXPENSE" | "INCOME" {
  if (category === "CUSTOMER") return "INCOME";
  return "EXPENSE";
}

export function ContactFinanceSection({ formData, setFormData, companyCode }: ContactFormSectionProps) {
  const filterClass = getFilterClass(formData.contactCategory);
  const categoryType = getCategoryType(formData.contactCategory);

  const updatePreset = (index: number, field: keyof TransactionPreset, value: string | boolean) => {
    const updated = [...formData.descriptionPresets];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, descriptionPresets: updated });
  };

  const addPreset = () => {
    setFormData({
      ...formData,
      descriptionPresets: [...formData.descriptionPresets, { ...EMPTY_PRESET }],
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

      {/* Transaction Presets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              <h3 className="font-medium text-sm">Preset รายการบันทึก</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              สร้าง preset ไว้ล่วงหน้า เวลาบันทึกธุรกรรมจะเลือกจาก dropdown แล้วเติมข้อมูลให้ทั้งหมด
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addPreset}>
            <Plus className="h-3 w-3" />
            เพิ่ม Preset
          </Button>
        </div>

        {formData.descriptionPresets.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
            ยังไม่มี preset กด &ldquo;เพิ่ม Preset&rdquo; เพื่อสร้าง
          </div>
        ) : (
          <div className="space-y-3">
            {formData.descriptionPresets.map((preset, index) => (
              <PresetCard
                key={index}
                preset={preset}
                index={index}
                companyCode={companyCode}
                filterClass={filterClass}
                categoryType={categoryType}
                onUpdate={updatePreset}
                onRemove={removePreset}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PresetCard({
  preset,
  index,
  companyCode,
  filterClass,
  categoryType,
  onUpdate,
  onRemove,
}: {
  preset: TransactionPreset;
  index: number;
  companyCode?: string;
  filterClass?: string;
  categoryType: "EXPENSE" | "INCOME";
  onUpdate: (index: number, field: keyof TransactionPreset, value: string | boolean) => void;
  onRemove: (index: number) => void;
}) {
  const [open, setOpen] = useState(true);

  const summaryParts: string[] = [];
  if (preset.description) summaryParts.push(preset.description);
  if (preset.vatRate) summaryParts.push(`VAT ${preset.vatRate}%`);
  if (preset.whtEnabled) summaryParts.push(`WHT ${preset.whtRate || "?"}%`);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {preset.label || <span className="text-muted-foreground italic">Preset #{index + 1}</span>}
            </p>
            {!open && summaryParts.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">{summaryParts.join(" · ")}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="p-3 space-y-3 border-t">
            {/* Row 1: Label + Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ชื่อ Preset</Label>
                <Input
                  value={preset.label}
                  onChange={(e) => onUpdate(index, "label", e.target.value)}
                  placeholder="เช่น ค่าบริการรายเดือน"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">คำอธิบาย</Label>
                <Input
                  value={preset.description}
                  onChange={(e) => onUpdate(index, "description", e.target.value)}
                  placeholder="คำอธิบายรายการ"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Row 2: Account + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">หมวดบัญชี</Label>
                {companyCode ? (
                  <AccountSelector
                    value={preset.accountId || null}
                    onValueChange={(val) => onUpdate(index, "accountId", val || "")}
                    companyCode={companyCode}
                    placeholder="ไม่ระบุ"
                    filterClass={filterClass}
                  />
                ) : (
                  <Input disabled placeholder="—" className="h-9 text-sm" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">หมวดหมู่</Label>
                {companyCode ? (
                  <CategorySelector
                    value={preset.categoryId || null}
                    onValueChange={(val) => onUpdate(index, "categoryId", val || "")}
                    companyCode={companyCode}
                    type={categoryType}
                    placeholder="ไม่ระบุ"
                  />
                ) : (
                  <Input disabled placeholder="—" className="h-9 text-sm" />
                )}
              </div>
            </div>

            {/* Row 3: VAT + WHT */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">VAT</Label>
                <Select
                  value={preset.vatRate || "__NONE__"}
                  onValueChange={(v) => onUpdate(index, "vatRate", v === "__NONE__" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="ไม่ระบุ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">ไม่ระบุ</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="7">7%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ประเภทเอกสาร</Label>
                <Select
                  value={preset.documentType || "__NONE__"}
                  onValueChange={(v) => onUpdate(index, "documentType", v === "__NONE__" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="ไม่ระบุ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">ไม่ระบุ</SelectItem>
                    <SelectItem value="TAX_INVOICE">ใบกำกับภาษี</SelectItem>
                    <SelectItem value="CASH_RECEIPT">บิลเงินสด</SelectItem>
                    <SelectItem value="NO_DOCUMENT">ไม่มีเอกสาร</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* WHT toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={preset.whtEnabled}
                  onCheckedChange={(checked) => {
                    onUpdate(index, "whtEnabled", checked);
                    if (checked && !preset.whtType) {
                      onUpdate(index, "whtType", "SERVICE");
                      onUpdate(index, "whtRate", "3");
                    }
                  }}
                />
                <Label className="text-xs cursor-pointer">หัก ณ ที่จ่าย</Label>
              </div>
              {preset.whtEnabled && (
                <div className="grid grid-cols-2 gap-3 pl-10">
                  <Select
                    value={preset.whtType || "SERVICE"}
                    onValueChange={(v) => {
                      onUpdate(index, "whtType", v);
                      onUpdate(index, "whtRate", WHT_RATE_BY_TYPE[v]?.toString() || preset.whtRate);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WHT_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={preset.whtRate}
                    onChange={(e) => onUpdate(index, "whtRate", e.target.value)}
                    placeholder="3"
                    className="h-9 text-sm"
                    min="0" max="100" step="0.01"
                  />
                </div>
              )}
            </div>

            {/* Row 4: Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">หมายเหตุ</Label>
              <Textarea
                value={preset.notes}
                onChange={(e) => onUpdate(index, "notes", e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                className="min-h-[36px] text-sm resize-none"
                rows={1}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
