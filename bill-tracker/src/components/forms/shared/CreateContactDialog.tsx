"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lightbulb, Send } from "lucide-react";
import { WHT_TYPE_OPTIONS, WHT_RATE_BY_TYPE } from "@/lib/constants/transaction";
import { getErrorMessage } from "@/lib/utils/error-helpers";

export interface ContactFormData {
  peakCode: string;
  contactCategory: string;
  entityType: string;
  businessType: string;
  nationality: string;
  prefix: string;
  firstName: string;
  lastName: string;
  name: string;
  taxId: string;
  branchCode: string;
  address: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  bankAccount: string;
  bankName: string;
  creditLimit: string;
  paymentTerms: string;
  notes: string;
  // Transaction Defaults
  defaultVatRate: string;
  defaultWhtEnabled: boolean;
  defaultWhtRate: string;
  defaultWhtType: string;
  descriptionTemplate: string;
  // Delivery Preferences
  preferredDeliveryMethod: string;
  deliveryEmail: string;
  deliveryNotes: string;
}

/**
 * Full Contact interface with all editable fields
 * Used for editing contacts in the dialog
 */
export interface Contact {
  id: string;
  name: string;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  creditLimit?: number | null;
  paymentTerms?: number | null;
  notes?: string | null;
  source?: "PEAK" | "MANUAL" | null;
  // Peak Integration
  peakCode?: string | null;
  // Entity Information
  contactCategory?: string | null;
  entityType?: string | null;
  businessType?: string | null;
  nationality?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  branchCode?: string | null;
  // Address Details
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  // Contact
  contactPerson?: string | null;
  // Transaction Defaults
  defaultVatRate?: number | null;
  defaultWhtEnabled?: boolean | null;
  defaultWhtRate?: number | null;
  defaultWhtType?: string | null;
  descriptionTemplate?: string | null;
  // Delivery Preferences
  preferredDeliveryMethod?: string | null;
  deliveryEmail?: string | null;
  deliveryNotes?: string | null;
}

/**
 * Convert Contact to ContactFormData
 * Centralizes the mapping logic and removes the need for `as any` casts
 */
function contactToFormData(contact: Contact): ContactFormData {
  return {
    peakCode: contact.peakCode || "",
    contactCategory: contact.contactCategory || "VENDOR",
    entityType: contact.entityType || "COMPANY",
    businessType: contact.businessType || "",
    nationality: contact.nationality || "ไทย",
    prefix: contact.prefix || "",
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    name: contact.name || "",
    taxId: contact.taxId || "",
    branchCode: contact.branchCode || "00000",
    address: contact.address || "",
    subDistrict: contact.subDistrict || "",
    district: contact.district || "",
    province: contact.province || "",
    postalCode: contact.postalCode || "",
    country: contact.country || "Thailand",
    contactPerson: contact.contactPerson || "",
    phone: contact.phone || "",
    email: contact.email || "",
    bankAccount: contact.bankAccount || "",
    bankName: contact.bankName || "",
    creditLimit: contact.creditLimit?.toString() || "",
    paymentTerms: contact.paymentTerms?.toString() || "",
    notes: contact.notes || "",
    // Transaction Defaults
    defaultVatRate: contact.defaultVatRate?.toString() || "",
    defaultWhtEnabled: contact.defaultWhtEnabled || false,
    defaultWhtRate: contact.defaultWhtRate?.toString() || "",
    defaultWhtType: contact.defaultWhtType || "",
    descriptionTemplate: contact.descriptionTemplate || "",
    // Delivery Preferences
    preferredDeliveryMethod: contact.preferredDeliveryMethod || "",
    deliveryEmail: contact.deliveryEmail || "",
    deliveryNotes: contact.deliveryNotes || "",
  };
}

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyCode: string;
  editingContact?: Contact | null;
  onSuccess?: (contact: Contact) => void;
}

const defaultFormData: ContactFormData = {
  peakCode: "",
  contactCategory: "VENDOR",
  entityType: "COMPANY",
  businessType: "",
  nationality: "ไทย",
  prefix: "",
  firstName: "",
  lastName: "",
  name: "",
  taxId: "",
  branchCode: "00000",
  address: "",
  subDistrict: "",
  district: "",
  province: "",
  postalCode: "",
  country: "Thailand",
  contactPerson: "",
  phone: "",
  email: "",
  bankAccount: "",
  bankName: "",
  creditLimit: "",
  paymentTerms: "",
  notes: "",
  // Transaction Defaults
  defaultVatRate: "",
  defaultWhtEnabled: false,
  defaultWhtRate: "",
  defaultWhtType: "",
  descriptionTemplate: "",
  // Delivery Preferences
  preferredDeliveryMethod: "",
  deliveryEmail: "",
  deliveryNotes: "",
};

export function CreateContactDialog({
  open,
  onOpenChange,
  companyCode,
  editingContact,
  onSuccess,
}: CreateContactDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(
    editingContact ? contactToFormData(editingContact) : defaultFormData
  );

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  // Watch for editingContact changes when dialog opens
  useEffect(() => {
    if (open && editingContact) {
      setFormData(contactToFormData(editingContact));
    } else if (open && !editingContact) {
      resetForm();
    }
  }, [open, editingContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent form
    if (!formData.name.trim()) {
      toast.error("กรุณาระบุชื่อ");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        companyCode: companyCode.toUpperCase(),
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
        paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms) : null,
        // Transaction Defaults
        defaultVatRate: formData.defaultVatRate ? parseInt(formData.defaultVatRate) : null,
        defaultWhtEnabled: formData.defaultWhtEnabled || null,
        defaultWhtRate: formData.defaultWhtRate ? parseFloat(formData.defaultWhtRate) : null,
        defaultWhtType: formData.defaultWhtType || null,
        descriptionTemplate: formData.descriptionTemplate || null,
        // Delivery Preferences
        preferredDeliveryMethod: formData.preferredDeliveryMethod || null,
        deliveryEmail: formData.deliveryEmail || null,
        deliveryNotes: formData.deliveryNotes || null,
        ...(editingContact && { id: editingContact.id }),
      };

      const res = await fetch("/api/contacts", {
        method: editingContact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingContact ? "แก้ไขสำเร็จ" : "เพิ่มผู้ติดต่อสำเร็จ");
        const createdContact = data.data?.contact || data.contact;
        onSuccess?.(createdContact);
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog opens with editing contact
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editingContact) {
      setFormData(contactToFormData(editingContact));
    } else if (newOpen && !editingContact) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingContact ? "แก้ไขผู้ติดต่อ" : "เพิ่มผู้ติดต่อใหม่"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={formData.contactCategory}
                  onValueChange={(value) => setFormData({ ...formData, contactCategory: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
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
                  value={formData.entityType}
                  onValueChange={(value) => setFormData({ ...formData, entityType: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
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

          <Separator />

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

          <Separator />

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
                      // Auto-set default WHT type and rate when enabling
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

          {/* Delivery Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium text-sm">วิธีส่งเอกสาร</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              กำหนดวิธีการส่งเอกสาร (ใบหัก ณ ที่จ่าย ฯลฯ) ให้ผู้ติดต่อนี้
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-deliveryMethod">วิธีส่งที่ต้องการ</Label>
                <Select
                  value={formData.preferredDeliveryMethod || "__NONE__"}
                  onValueChange={(value) => setFormData({ ...formData, preferredDeliveryMethod: value === "__NONE__" ? "" : value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="ไม่ระบุ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">ไม่ระบุ</SelectItem>
                    <SelectItem value="email">📧 อีเมล</SelectItem>
                    <SelectItem value="physical">📬 ส่งตัวจริง (ไปรษณีย์/messenger)</SelectItem>
                    <SelectItem value="line">💬 LINE</SelectItem>
                    <SelectItem value="pickup">🏢 มารับเอง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.preferredDeliveryMethod === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="contact-deliveryEmail">อีเมลสำหรับส่งเอกสาร</Label>
                  <Input
                    id="contact-deliveryEmail"
                    type="email"
                    value={formData.deliveryEmail}
                    onChange={(e) => setFormData({ ...formData, deliveryEmail: e.target.value })}
                    placeholder={formData.email || "email@example.com"}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    หากไม่ระบุจะใช้อีเมลหลักของผู้ติดต่อ
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="contact-deliveryNotes">หมายเหตุการส่ง</Label>
                <Input
                  id="contact-deliveryNotes"
                  value={formData.deliveryNotes}
                  onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                  placeholder="เช่น ส่งถึงคุณสมชาย ฝ่ายบัญชี"
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
