"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Lightbulb } from "lucide-react";
import { WHT_TYPE_OPTIONS, WHT_RATE_BY_TYPE } from "@/lib/constants/transaction";
import type { ContactFormSectionProps } from "./contact-form-types";

export function ContactFinanceSection({ formData, setFormData }: ContactFormSectionProps) {
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
            <Label htmlFor="contact-descriptionTemplate">คำอธิบาย/รายละเอียด</Label>
            <Input
              id="contact-descriptionTemplate"
              value={formData.descriptionTemplate}
              onChange={(e) => setFormData({ ...formData, descriptionTemplate: e.target.value })}
              placeholder="เช่น ค่าบริการรายเดือน"
              className="h-10"
            />
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
    </>
  );
}
