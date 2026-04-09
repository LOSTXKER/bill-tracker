"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/error-helpers";
import {
  Contact,
  ContactFormData,
  contactToFormData,
  defaultFormData,
} from "./contact-form-types";

interface UseContactFormOptions {
  open: boolean;
  companyCode: string;
  editingContact?: Contact | null;
  onSuccess?: (contact: Contact) => void;
  onOpenChange: (open: boolean) => void;
}

export function useContactForm({
  open,
  companyCode,
  editingContact,
  onSuccess,
  onOpenChange,
}: UseContactFormOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(
    editingContact ? contactToFormData(editingContact) : defaultFormData
  );

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  useEffect(() => {
    if (open && editingContact) {
      setFormData(contactToFormData(editingContact));
    } else if (open && !editingContact) {
      resetForm();
    }
  }, [open, editingContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
        descriptionPresets: formData.descriptionPresets.filter((p) => p.label.trim() || p.description.trim()),
        preferredDeliveryMethod: formData.preferredDeliveryMethod || null,
        deliveryEmail: formData.deliveryEmail || null,
        deliveryNotes: formData.deliveryNotes || null,
        taxInvoiceRequestMethod: formData.taxInvoiceRequestMethod || null,
        taxInvoiceRequestEmail: formData.taxInvoiceRequestEmail || null,
        taxInvoiceRequestNotes: formData.taxInvoiceRequestNotes || null,
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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editingContact) {
      setFormData(contactToFormData(editingContact));
    } else if (newOpen && !editingContact) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return { formData, setFormData, isSubmitting, handleSubmit, handleOpenChange };
}
