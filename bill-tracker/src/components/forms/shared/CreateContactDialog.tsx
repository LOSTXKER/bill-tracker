"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useContactForm } from "./useContactForm";
import { ContactBasicInfoSection, ContactNotesSection } from "./ContactBasicInfoSection";
import { ContactAddressSection } from "./ContactAddressSection";
import { ContactFinanceSection } from "./ContactFinanceSection";
import { ContactDeliverySection } from "./ContactDeliverySection";

export type { ContactFormData, Contact } from "./contact-form-types";

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyCode: string;
  editingContact?: import("./contact-form-types").Contact | null;
  onSuccess?: (contact: import("./contact-form-types").Contact) => void;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  companyCode,
  editingContact,
  onSuccess,
}: CreateContactDialogProps) {
  const { formData, setFormData, isSubmitting, handleSubmit, handleOpenChange } =
    useContactForm({ open, companyCode, editingContact, onSuccess, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingContact ? "แก้ไขผู้ติดต่อ" : "เพิ่มผู้ติดต่อใหม่"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ContactBasicInfoSection formData={formData} setFormData={setFormData} />

          <Separator />

          <ContactAddressSection formData={formData} setFormData={setFormData} />

          <Separator />

          <ContactFinanceSection formData={formData} setFormData={setFormData} companyCode={companyCode} />

          <Separator />

          <ContactDeliverySection formData={formData} setFormData={setFormData} />

          <Separator />

          <ContactNotesSection formData={formData} setFormData={setFormData} />

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
