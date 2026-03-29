"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ContactFormSectionProps } from "./contact-form-types";

export function ContactAddressSection({ formData, setFormData }: ContactFormSectionProps) {
  return (
    <>
      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">ที่อยู่</h3>
        <div className="space-y-2">
          <Label htmlFor="contact-address">ที่อยู่</Label>
          <Input
            id="contact-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="บ้านเลขที่ ซอย ถนน"
            className="h-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-subDistrict">แขวง/ตำบล</Label>
            <Input
              id="contact-subDistrict"
              value={formData.subDistrict}
              onChange={(e) => setFormData({ ...formData, subDistrict: e.target.value })}
              placeholder="แขวง/ตำบล"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-district">เขต/อำเภอ</Label>
            <Input
              id="contact-district"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              placeholder="เขต/อำเภอ"
              className="h-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="contact-province">จังหวัด</Label>
            <Input
              id="contact-province"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              placeholder="จังหวัด"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-postalCode">รหัสไปรษณีย์</Label>
            <Input
              id="contact-postalCode"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="10100"
              className="h-10"
              maxLength={5}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">การติดต่อ</h3>
        <div className="space-y-2">
          <Label htmlFor="contact-contactPerson">ชื่อผู้ติดต่อ</Label>
          <Input
            id="contact-contactPerson"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            placeholder="ชื่อผู้ติดต่อ"
            className="h-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-phone">เบอร์โทร</Label>
            <Input
              id="contact-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08x-xxx-xxxx"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">อีเมล</Label>
            <Input
              id="contact-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              className="h-10"
            />
          </div>
        </div>
      </div>
    </>
  );
}
