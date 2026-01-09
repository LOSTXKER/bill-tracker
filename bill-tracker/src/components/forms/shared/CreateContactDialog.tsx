"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export interface ContactFormData {
  name: string;
  taxId: string;
  address: string;
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
  name: "",
  taxId: "",
  address: "",
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
          name: editingContact.name || "",
          taxId: editingContact.taxId || "",
          address: editingContact.address || "",
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
        name: editingContact.name || "",
        taxId: editingContact.taxId || "",
        address: editingContact.address || "",
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingContact ? "แก้ไขผู้ติดต่อ" : "เพิ่มผู้ติดต่อใหม่"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">ชื่อ *</Label>
            <Input
              id="contact-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ชื่อบุคคลหรือบริษัท"
              className="h-11"
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
                className="h-11"
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
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-taxId">เลขประจำตัวผู้เสียภาษี</Label>
            <Input
              id="contact-taxId"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              placeholder="13 หลัก"
              className="h-11"
              maxLength={13}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-address">ที่อยู่</Label>
            <Textarea
              id="contact-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="ที่อยู่เต็ม"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-bankName">ธนาคาร</Label>
              <Input
                id="contact-bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="เช่น กสิกรไทย"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-bankAccount">เลขบัญชี</Label>
              <Input
                id="contact-bankAccount"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="xxx-x-xxxxx-x"
                className="h-11"
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
                className="h-11"
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
                className="h-11"
              />
            </div>
          </div>

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
