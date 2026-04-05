"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactSelector } from "@/components/forms/shared/ContactSelector";
import { CategorySelector } from "@/components/forms/shared/CategorySelector";
import { AccountSelector } from "@/components/forms/shared/account-selector";
import { DatePicker } from "@/components/forms/shared/DatePicker";
import { useContacts } from "@/hooks/use-contacts";
import { toast } from "sonner";
import type { ContactSummary } from "@/types";

export interface BulkEditFields {
  [key: string]: unknown;
}

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionType: "expense" | "income";
  selectedCount: number;
  companyCode: string;
  onSubmit: (fields: BulkEditFields) => Promise<void>;
}

interface FieldToggleState {
  description: boolean;
  date: boolean;
  contact: boolean;
  category: boolean;
  account: boolean;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  transactionType,
  selectedCount,
  companyCode,
  onSubmit,
}: BulkEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enabled, setEnabled] = useState<FieldToggleState>({
    description: false,
    date: false,
    contact: false,
    category: false,
    account: false,
  });

  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [contactName, setContactName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);

  const isExpense = transactionType === "expense";
  const descriptionLabel = isExpense ? "รายละเอียด" : "รายละเอียด (source)";
  const dateLabel = isExpense ? "วันที่บิล" : "วันที่รับ";
  const categoryType = isExpense ? "EXPENSE" as const : "INCOME" as const;
  const accountFilterClass = isExpense ? "EXPENSE" : "REVENUE";

  const toggleField = useCallback((field: keyof FieldToggleState) => {
    setEnabled((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const hasEnabledFields = Object.values(enabled).some(Boolean);

  const resetForm = useCallback(() => {
    setEnabled({
      description: false,
      date: false,
      contact: false,
      category: false,
      account: false,
    });
    setDescription("");
    setDate(undefined);
    setSelectedContact(null);
    setContactName("");
    setCategoryId(null);
    setAccountId(null);
  }, []);

  const handleSubmit = async () => {
    const fields: BulkEditFields = {};

    if (enabled.description) {
      const key = isExpense ? "description" : "source";
      fields[key] = description;
    }

    if (enabled.date && date) {
      const key = isExpense ? "billDate" : "receiveDate";
      fields[key] = date.toISOString();
    }

    if (enabled.contact) {
      if (selectedContact) {
        fields.contactId = selectedContact.id;
        fields.contactName = selectedContact.name;
      } else if (contactName) {
        fields.contactId = null;
        fields.contactName = contactName;
      }
    }

    if (enabled.category) {
      fields.categoryId = categoryId;
    }

    if (enabled.account) {
      fields.accountId = accountId;
    }

    if (Object.keys(fields).length === 0) return;

    setIsSubmitting(true);
    const toastId = toast.loading(`กำลังแก้ไข ${selectedCount} รายการ...`);
    try {
      await onSubmit(fields);
      toast.success(`แก้ไข ${selectedCount} รายการสำเร็จ`, { id: toastId });
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการแก้ไข", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขหลายรายการ</DialogTitle>
          <DialogDescription>
            เลือก field ที่ต้องการแก้ไข แล้วตั้งค่าใหม่ จะ apply กับ {selectedCount} รายการที่เลือก
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description / Source */}
          <FieldRow
            label={descriptionLabel}
            checked={enabled.description}
            onToggle={() => toggleField("description")}
          >
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isExpense ? "รายละเอียดค่าใช้จ่าย" : "รายละเอียดรายรับ"}
              disabled={!enabled.description}
            />
          </FieldRow>

          {/* Date */}
          <FieldRow
            label={dateLabel}
            checked={enabled.date}
            onToggle={() => toggleField("date")}
          >
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder={isExpense ? "เลือกวันที่บิล" : "เลือกวันที่รับ"}
              disabled={!enabled.date}
            />
          </FieldRow>

          {/* Contact */}
          <FieldRow
            label="ผู้ติดต่อ"
            checked={enabled.contact}
            onToggle={() => toggleField("contact")}
          >
            <ContactSelector
              contacts={contacts}
              isLoading={contactsLoading}
              selectedContact={selectedContact}
              onSelect={setSelectedContact}
              companyCode={companyCode}
              onContactCreated={(contact) => {
                setSelectedContact(contact);
                refetchContacts();
              }}
              contactName={contactName}
              onContactNameChange={setContactName}
              allowCreate={enabled.contact}
              mode="edit"
            />
          </FieldRow>

          {/* Category */}
          <FieldRow
            label="หมวดหมู่"
            checked={enabled.category}
            onToggle={() => toggleField("category")}
          >
            <CategorySelector
              value={categoryId}
              onValueChange={setCategoryId}
              companyCode={companyCode}
              type={categoryType}
              disabled={!enabled.category}
            />
          </FieldRow>

          {/* Account */}
          <FieldRow
            label="บัญชี"
            checked={enabled.account}
            onToggle={() => toggleField("account")}
          >
            <AccountSelector
              value={accountId}
              onValueChange={setAccountId}
              companyCode={companyCode}
              filterClass={accountFilterClass}
              disabled={!enabled.account}
            />
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!hasEnabledFields}
          >
            บันทึก ({selectedCount} รายการ)
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  checked,
  onToggle,
  children,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          id={`bulk-field-${label}`}
        />
        <Label
          htmlFor={`bulk-field-${label}`}
          className="cursor-pointer text-sm font-medium"
        >
          {label}
        </Label>
      </div>
      <div className={checked ? "" : "pointer-events-none opacity-40"}>
        {children}
      </div>
    </div>
  );
}
