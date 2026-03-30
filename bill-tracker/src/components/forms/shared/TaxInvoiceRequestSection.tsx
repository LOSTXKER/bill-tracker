"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";
import { getTaxInvoiceRequestMethod, TAX_INVOICE_REQUEST_METHODS } from "@/lib/constants/delivery-methods";
import type { ContactSummary } from "@/types";

interface TaxInvoiceRequestEditProps {
  mode: "edit";
  documentType?: string;
  taxInvoiceRequestMethod: string | null;
  onTaxInvoiceRequestMethodChange: (method: string | null) => void;
  taxInvoiceRequestEmail?: string | null;
  onTaxInvoiceRequestEmailChange?: (email: string | null) => void;
  taxInvoiceRequestNotes?: string | null;
  onTaxInvoiceRequestNotesChange?: (notes: string | null) => void;
  updateContactTaxInvoiceRequest?: boolean;
  onUpdateContactTaxInvoiceRequestChange?: (update: boolean) => void;
  selectedContact: ContactSummary | null;
}

interface TaxInvoiceRequestViewProps {
  mode: "view";
  documentType?: string;
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
  selectedContact: ContactSummary | null;
}

type TaxInvoiceRequestSectionProps = TaxInvoiceRequestEditProps | TaxInvoiceRequestViewProps;

export function TaxInvoiceRequestSection(props: TaxInvoiceRequestSectionProps) {
  if (props.mode === "view") {
    return <TaxInvoiceRequestView {...props} />;
  }
  return <TaxInvoiceRequestEdit {...props} />;
}

function TaxInvoiceRequestView({
  documentType,
  taxInvoiceRequestMethod,
  taxInvoiceRequestEmail,
  taxInvoiceRequestNotes,
  selectedContact,
}: TaxInvoiceRequestViewProps) {
  const isCashReceipt = documentType === "CASH_RECEIPT";
  const sectionLabel = isCashReceipt ? "ช่องทางขอบิลเงินสด" : "ช่องทางขอใบกำกับภาษี";
  const displayMethod = taxInvoiceRequestMethod || selectedContact?.taxInvoiceRequestMethod;
  const displayEmail = taxInvoiceRequestMethod === "EMAIL" ? taxInvoiceRequestEmail : selectedContact?.taxInvoiceRequestEmail;
  const displayNotes = taxInvoiceRequestNotes || selectedContact?.taxInvoiceRequestNotes;

  if (!displayMethod && !displayNotes) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
          {sectionLabel}
        </p>
      </div>
      <div className="space-y-2 text-sm">
        {displayMethod && (() => {
          const method = getTaxInvoiceRequestMethod(displayMethod);
          if (!method) return null;
          const Icon = method.Icon;
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-foreground font-medium">{method.label}</span>
              {displayMethod === "EMAIL" && displayEmail && (
                <span className="text-muted-foreground">({displayEmail})</span>
              )}
            </div>
          );
        })()}
        {displayNotes && (
          <p className="text-muted-foreground pl-6 whitespace-pre-wrap">
            {displayNotes}
          </p>
        )}
      </div>
    </div>
  );
}

function TaxInvoiceRequestEdit({
  documentType,
  taxInvoiceRequestMethod,
  onTaxInvoiceRequestMethodChange,
  taxInvoiceRequestEmail,
  onTaxInvoiceRequestEmailChange,
  taxInvoiceRequestNotes,
  onTaxInvoiceRequestNotesChange,
  updateContactTaxInvoiceRequest,
  onUpdateContactTaxInvoiceRequestChange,
  selectedContact,
}: TaxInvoiceRequestEditProps) {
  const isCashReceipt = documentType === "CASH_RECEIPT";
  const sectionLabel = isCashReceipt ? "ช่องทางขอบิลเงินสด" : "ช่องทางขอใบกำกับภาษี";
  const placeholder = isCashReceipt ? "เลือกช่องทางขอบิลเงินสด *" : "เลือกช่องทางขอใบกำกับ *";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
        <Label className="text-sm font-medium">{sectionLabel}</Label>
      </div>

      <Select
        value={taxInvoiceRequestMethod || ""}
        onValueChange={(v) => onTaxInvoiceRequestMethodChange(v || null)}
      >
        <SelectTrigger className="h-9 bg-background">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {TAX_INVOICE_REQUEST_METHODS.map((method) => {
            const Icon = method.Icon;
            return (
              <SelectItem key={method.value} value={method.value}>
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {method.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {taxInvoiceRequestMethod === "EMAIL" && onTaxInvoiceRequestEmailChange && (
        <Input
          type="email"
          placeholder={isCashReceipt ? "อีเมลสำหรับขอบิลเงินสด" : "อีเมลสำหรับขอใบกำกับ"}
          value={taxInvoiceRequestEmail || ""}
          onChange={(e) => onTaxInvoiceRequestEmailChange(e.target.value || null)}
          className="h-9 bg-background"
        />
      )}

      {taxInvoiceRequestMethod === "SHOPEE" && onTaxInvoiceRequestNotesChange && (
        <Input
          placeholder="ชื่อแชทร้าน / ลิงค์ Shopee"
          value={taxInvoiceRequestNotes || ""}
          onChange={(e) => onTaxInvoiceRequestNotesChange(e.target.value || null)}
          className="h-9 bg-background"
        />
      )}

      {taxInvoiceRequestMethod && taxInvoiceRequestMethod !== "SHOPEE" && onTaxInvoiceRequestNotesChange && (
        <Textarea
          placeholder={
            taxInvoiceRequestMethod === "OTHER"
              ? "ระบุช่องทาง เช่น Facebook, Lazada..."
              : isCashReceipt ? "หมายเหตุการขอบิลเงินสด (ถ้ามี)" : "หมายเหตุการขอใบกำกับ (ถ้ามี)"
          }
          value={taxInvoiceRequestNotes || ""}
          onChange={(e) => onTaxInvoiceRequestNotesChange(e.target.value || null)}
          className="min-h-[40px] bg-background resize-none"
          rows={1}
        />
      )}

      {selectedContact && onUpdateContactTaxInvoiceRequestChange && taxInvoiceRequestMethod && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="updateContactTaxInvoiceRequest"
            checked={updateContactTaxInvoiceRequest}
            onCheckedChange={(checked) => onUpdateContactTaxInvoiceRequestChange(checked === true)}
          />
          <label
            htmlFor="updateContactTaxInvoiceRequest"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            บันทึกเป็นค่าเริ่มต้นของ &quot;{selectedContact.name}&quot;
          </label>
        </div>
      )}
    </div>
  );
}
