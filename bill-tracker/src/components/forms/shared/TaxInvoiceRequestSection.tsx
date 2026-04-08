"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTaxInvoiceRequestMethod, TAX_INVOICE_REQUEST_METHODS } from "@/lib/constants/delivery-methods";
import { MethodDropdown } from "./MethodDropdown";
import { useTransactionFormContext } from "../TransactionFormContext";
import type { ContactSummary } from "@/types";

interface TaxInvoiceRequestEditProps {
  mode: "edit";
  documentType?: string;
}

interface TaxInvoiceRequestViewProps {
  mode: "view";
  documentType?: string;
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
  selectedContact: ContactSummary | null;
  hasDocument?: boolean;
}

type TaxInvoiceRequestSectionProps = TaxInvoiceRequestEditProps | TaxInvoiceRequestViewProps;

export function TaxInvoiceRequestSection(props: TaxInvoiceRequestSectionProps) {
  if (props.mode === "view") {
    return <TaxInvoiceRequestView {...props} />;
  }
  return <TaxInvoiceRequestEdit documentType={props.documentType} />;
}

function TaxInvoiceRequestView({
  documentType,
  taxInvoiceRequestMethod,
  taxInvoiceRequestEmail,
  taxInvoiceRequestNotes,
  selectedContact,
  hasDocument,
}: TaxInvoiceRequestViewProps) {
  const isCashReceipt = documentType === "CASH_RECEIPT";
  const docLabel = isCashReceipt ? "บิลเงินสด" : "ใบกำกับภาษี";
  const sectionLabel = isCashReceipt ? "ช่องทางขอบิลเงินสด" : "ช่องทางขอใบกำกับภาษี";
  const displayMethod = taxInvoiceRequestMethod || selectedContact?.taxInvoiceRequestMethod;
  const displayEmail = taxInvoiceRequestMethod === "EMAIL" ? taxInvoiceRequestEmail : selectedContact?.taxInvoiceRequestEmail;
  const displayNotes = taxInvoiceRequestNotes || selectedContact?.taxInvoiceRequestNotes;

  if (hasDocument && !displayMethod && !displayNotes) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            ได้รับ{docLabel}แล้ว
          </p>
        </div>
      </div>
    );
  }

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

function TaxInvoiceRequestEdit({ documentType }: { documentType?: string }) {
  const {
    selectedContact,
    taxInvoiceRequestMethod,
    onTaxInvoiceRequestMethodChange,
    taxInvoiceRequestEmail,
    onTaxInvoiceRequestEmailChange,
    taxInvoiceRequestNotes,
    onTaxInvoiceRequestNotesChange,
    updateContactTaxInvoiceRequest,
    onUpdateContactTaxInvoiceRequestChange,
    hasDocument,
    onHasDocumentChange,
  } = useTransactionFormContext();

  const isCashReceipt = documentType === "CASH_RECEIPT";
  const docLabel = isCashReceipt ? "บิลเงินสด" : "ใบกำกับภาษี";
  const sectionLabel = isCashReceipt ? "ช่องทางขอบิลเงินสด" : "ช่องทางขอใบกำกับภาษี";
  const placeholder = isCashReceipt ? "เลือกช่องทางขอบิลเงินสด *" : "เลือกช่องทางขอใบกำกับ *";

  const isAutoFilled = !!(taxInvoiceRequestMethod && selectedContact?.taxInvoiceRequestMethod &&
    taxInvoiceRequestMethod.toUpperCase() === selectedContact.taxInvoiceRequestMethod.toUpperCase());

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
        <Label className="text-sm font-medium">{sectionLabel}</Label>
        {isAutoFilled && (
          <span className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-full">
            จากผู้ติดต่อ
          </span>
        )}
      </div>

      {onHasDocumentChange && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onHasDocumentChange(!hasDocument)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onHasDocumentChange(!hasDocument); } }}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors w-full cursor-pointer",
            hasDocument
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
          )}
        >
          <div
            className={cn(
              "relative inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-colors",
              hasDocument ? "bg-primary" : "bg-input dark:bg-input/80"
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                "pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform",
                hasDocument ? "translate-x-[calc(100%-2px)]" : "translate-x-0"
              )}
            />
          </div>
          <span className="select-none">
            {hasDocument ? `ได้รับ${docLabel}แล้ว` : `ได้รับ${docLabel}แล้ว?`}
          </span>
          {hasDocument && <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0" />}
        </div>
      )}

      {!hasDocument && (
        <>
          <MethodDropdown
            value={taxInvoiceRequestMethod ?? null}
            onValueChange={(v) => onTaxInvoiceRequestMethodChange?.(v || null)}
            options={TAX_INVOICE_REQUEST_METHODS}
            placeholder={placeholder}
            className="bg-background"
          />

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
        </>
      )}
    </div>
  );
}
