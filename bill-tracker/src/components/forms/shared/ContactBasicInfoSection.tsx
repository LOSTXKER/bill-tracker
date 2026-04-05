"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ContactFormSectionProps } from "./contact-form-types";

export function ContactBasicInfoSection({ formData, setFormData }: ContactFormSectionProps) {
  return (
    <>
      {/* Peak Sync */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">Peak Integration</h3>
        <div className="space-y-2">
          <Label htmlFor="contact-peakCode">รหัสผู้ติดต่อ Peak</Label>
          <Input
            id="contact-peakCode"
            value={formData.peakCode}
            onChange={(e) => setFormData({ ...formData, peakCode: e.target.value })}
            placeholder="C00001"
            className="h-10"
          />
        </div>
      </div>

      <Separator />

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">ข้อมูลพื้นฐาน</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-category">ประเภทผู้ติดต่อ</Label>
            <Select
              value={formData.contactCategory || undefined}
              onValueChange={(value) => setFormData({ ...formData, contactCategory: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">ลูกค้า</SelectItem>
                <SelectItem value="VENDOR">ผู้จำหน่าย</SelectItem>
                <SelectItem value="BOTH">ทั้งสองอย่าง</SelectItem>
                <SelectItem value="OTHER">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-entityType">ประเภทกิจการ</Label>
            <Select
              value={formData.entityType || undefined}
              onValueChange={(value) => setFormData({ ...formData, entityType: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="เลือกประเภทกิจการ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">บุคคลธรรมดา</SelectItem>
                <SelectItem value="COMPANY">นิติบุคคล</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-prefix">คำนำหน้า</Label>
            <Input
              id="contact-prefix"
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              placeholder="นาย, นาง, บริษัท"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-firstName">ชื่อ</Label>
            <Input
              id="contact-firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="ชื่อ"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-lastName">นามสกุล</Label>
            <Input
              id="contact-lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="นามสกุล"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-name">ชื่อเต็ม/ชื่อบริษัท *</Label>
          <Input
            id="contact-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ชื่อเต็ม"
            className="h-10"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="contact-taxId">เลขประจำตัวผู้เสียภาษี</Label>
            <Input
              id="contact-taxId"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              placeholder="13 หลัก"
              className="h-10"
              maxLength={13}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-branchCode">รหัสสาขา</Label>
            <Input
              id="contact-branchCode"
              value={formData.branchCode}
              onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
              placeholder="00000"
              className="h-10"
              maxLength={5}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export function ContactNotesSection({ formData, setFormData }: ContactFormSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="contact-notes">หมายเหตุ</Label>
      <Textarea
        id="contact-notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="หมายเหตุเพิ่มเติม"
        rows={2}
      />
    </div>
  );
}
