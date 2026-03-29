"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import { getTaxInvoiceRequestMethod, TAX_INVOICE_REQUEST_METHODS } from "@/lib/constants/delivery-methods";
import type { ContactSummary } from "@/types";

interface TaxInvoiceRequestEditProps {
  mode: "edit";
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
  taxInvoiceRequestMethod,
  taxInvoiceRequestEmail,
  taxInvoiceRequestNotes,
  selectedContact,
}: TaxInvoiceRequestViewProps) {
  const displayMethod = taxInvoiceRequestMethod || selectedContact?.taxInvoiceRequestMethod;
  const displayEmail = taxInvoiceRequestMethod === "EMAIL" ? taxInvoiceRequestEmail : selectedContact?.taxInvoiceRequestEmail;
  const displayNotes = taxInvoiceRequestNotes || selectedContact?.taxInvoiceRequestNotes;

  if (!displayMethod && !displayNotes) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
          ช่องทางขอใบกำกับภาษี
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
  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <Label className="text-sm font-medium text-orange-900 dark:text-orange-100">
          ช่องทางขอใบกำกับภาษี
        </Label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TAX_INVOICE_REQUEST_METHODS.map((method) => {
          const Icon = method.Icon;
          const isSelected = taxInvoiceRequestMethod === method.value;
          return (
            <Button
              key={method.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={`justify-start gap-2 h-auto py-3 ${
                isSelected
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50"
              }`}
              onClick={() => onTaxInvoiceRequestMethodChange(isSelected ? null : method.value)}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{method.label}</span>
            </Button>
          );
        })}
      </div>

      {taxInvoiceRequestMethod === "EMAIL" && onTaxInvoiceRequestEmailChange && (
        <div className="space-y-2">
          <Label className="text-sm text-orange-900 dark:text-orange-100">
            อีเมลสำหรับขอใบกำกับ
          </Label>
          <Input
            type="email"
            placeholder="email@example.com"
            value={taxInvoiceRequestEmail || ""}
            onChange={(e) => onTaxInvoiceRequestEmailChange(e.target.value || null)}
            className="h-10 bg-white dark:bg-background border-orange-200 dark:border-orange-800"
          />
        </div>
      )}

      {taxInvoiceRequestMethod === "SHOPEE" && onTaxInvoiceRequestNotesChange && (
        <div className="space-y-2">
          <Label className="text-sm text-orange-900 dark:text-orange-100">
            ชื่อแชทร้าน / ลิงค์ Shopee <span className="text-orange-400">(จำเป็น)</span>
          </Label>
          <Input
            placeholder="เช่น ชื่อร้าน Shopee หรือ https://shopee.co.th/..."
            value={taxInvoiceRequestNotes || ""}
            onChange={(e) => onTaxInvoiceRequestNotesChange(e.target.value || null)}
            className="h-10 bg-white dark:bg-background border-orange-200 dark:border-orange-800"
          />
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ระบุชื่อแชทร้านหรือลิงค์ เพื่อให้บัญชีไปตามทวงใบกำกับได้
          </p>
        </div>
      )}

      {taxInvoiceRequestMethod !== "SHOPEE" && onTaxInvoiceRequestNotesChange && (
        <div className="space-y-2">
          <Label className="text-sm text-orange-900 dark:text-orange-100">
            {taxInvoiceRequestMethod === "OTHER" ? "ระบุช่องทาง / รายละเอียด" : "หมายเหตุการขอใบกำกับ (ถ้ามี)"}
          </Label>
          <Textarea
            placeholder={
              taxInvoiceRequestMethod === "OTHER"
                ? "ระบุช่องทาง เช่น Facebook, Lazada, เว็บไซต์ร้านค้า..."
                : "เช่น ติดต่อคุณสมชาย 081-xxx-xxxx ฝ่ายบัญชี..."
            }
            value={taxInvoiceRequestNotes || ""}
            onChange={(e) => onTaxInvoiceRequestNotesChange(e.target.value || null)}
            className="min-h-[60px] bg-white dark:bg-background border-orange-200 dark:border-orange-800"
          />
        </div>
      )}

      {selectedContact && onUpdateContactTaxInvoiceRequestChange && taxInvoiceRequestMethod && (
        <div className="flex items-center space-x-2 pt-2 border-t border-orange-200 dark:border-orange-800">
          <Checkbox
            id="updateContactTaxInvoiceRequest"
            checked={updateContactTaxInvoiceRequest}
            onCheckedChange={(checked) => onUpdateContactTaxInvoiceRequestChange(checked === true)}
          />
          <label
            htmlFor="updateContactTaxInvoiceRequest"
            className="text-sm text-orange-900 dark:text-orange-100 cursor-pointer"
          >
            บันทึกเป็นค่าเริ่มต้นของ &quot;{selectedContact.name}&quot;
          </label>
        </div>
      )}
    </div>
  );
}
