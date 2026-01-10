"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";

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
}

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
    editingContact
      ? {
          peakCode: (editingContact as any).peakCode || "",
          contactCategory: (editingContact as any).contactCategory || "VENDOR",
          entityType: (editingContact as any).entityType || "COMPANY",
          businessType: (editingContact as any).businessType || "",
          nationality: (editingContact as any).nationality || "ไทย",
          prefix: (editingContact as any).prefix || "",
          firstName: (editingContact as any).firstName || "",
          lastName: (editingContact as any).lastName || "",
          name: editingContact.name || "",
          taxId: editingContact.taxId || "",
          branchCode: (editingContact as any).branchCode || "00000",
          address: editingContact.address || "",
          subDistrict: (editingContact as any).subDistrict || "",
          district: (editingContact as any).district || "",
          province: (editingContact as any).province || "",
          postalCode: (editingContact as any).postalCode || "",
          country: (editingContact as any).country || "Thailand",
          contactPerson: (editingContact as any).contactPerson || "",
          phone: editingContact.phone || "",
          email: editingContact.email || "",
          bankAccount: editingContact.bankAccount || "",
          bankName: editingContact.bankName || "",
          creditLimit: editingContact.creditLimit?.toString() || "",
          paymentTerms: editingContact.paymentTerms?.toString() || "",
          notes: editingContact.notes || "",
        }
      : defaultFormData
  );

  const resetForm = () => {
    setFormData(defaultFormData);
  };

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
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog opens with editing contact
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editingContact) {
      setFormData({
        peakCode: (editingContact as any).peakCode || "",
        contactCategory: (editingContact as any).contactCategory || "VENDOR",
        entityType: (editingContact as any).entityType || "COMPANY",
        businessType: (editingContact as any).businessType || "",
        nationality: (editingContact as any).nationality || "ไทย",
        prefix: (editingContact as any).prefix || "",
        firstName: (editingContact as any).firstName || "",
        lastName: (editingContact as any).lastName || "",
        name: editingContact.name || "",
        taxId: editingContact.taxId || "",
        branchCode: (editingContact as any).branchCode || "00000",
        address: editingContact.address || "",
        subDistrict: (editingContact as any).subDistrict || "",
        district: (editingContact as any).district || "",
        province: (editingContact as any).province || "",
        postalCode: (editingContact as any).postalCode || "",
        country: (editingContact as any).country || "Thailand",
        contactPerson: (editingContact as any).contactPerson || "",
        phone: editingContact.phone || "",
        email: editingContact.email || "",
        bankAccount: editingContact.bankAccount || "",
        bankName: editingContact.bankName || "",
        creditLimit: editingContact.creditLimit?.toString() || "",
        paymentTerms: editingContact.paymentTerms?.toString() || "",
        notes: editingContact.notes || "",
      });
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
