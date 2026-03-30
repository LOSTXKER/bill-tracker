"use client";

import type { ContactSummary } from "@/types";
import { WhtDeliverySection } from "./WhtDeliverySection";
import { TaxInvoiceRequestSection } from "./TaxInvoiceRequestSection";
import { ReferenceUrlsSection } from "./ReferenceUrlsSection";

interface DocumentSettingsBlockProps {
  mode: "edit" | "view";
  configType: "expense" | "income";
  documentType?: string;
  isWht?: boolean;
  selectedContact?: ContactSummary | null;
  // WHT delivery
  whtDeliveryMethod?: string | null;
  onWhtDeliveryMethodChange?: ((v: string | null) => void) | undefined;
  whtDeliveryEmail?: string | null;
  onWhtDeliveryEmailChange?: ((v: string | null) => void) | undefined;
  whtDeliveryNotes?: string | null;
  onWhtDeliveryNotesChange?: ((v: string | null) => void) | undefined;
  updateContactDelivery?: boolean;
  onUpdateContactDeliveryChange?: ((v: boolean) => void) | undefined;
  // Tax invoice
  taxInvoiceRequestMethod?: string | null;
  onTaxInvoiceRequestMethodChange?: ((v: string | null) => void) | undefined;
  taxInvoiceRequestEmail?: string | null;
  onTaxInvoiceRequestEmailChange?: ((v: string | null) => void) | undefined;
  taxInvoiceRequestNotes?: string | null;
  onTaxInvoiceRequestNotesChange?: ((v: string | null) => void) | undefined;
  updateContactTaxInvoiceRequest?: boolean;
  onUpdateContactTaxInvoiceRequestChange?: ((v: boolean) => void) | undefined;
  // Reference URLs
  referenceUrls: string[];
  onReferenceUrlsChange?: ((urls: string[]) => void) | undefined;
}

export function DocumentSettingsBlock({
  mode,
  configType,
  documentType,
  isWht,
  selectedContact,
  whtDeliveryMethod,
  onWhtDeliveryMethodChange,
  whtDeliveryEmail,
  onWhtDeliveryEmailChange,
  whtDeliveryNotes,
  onWhtDeliveryNotesChange,
  updateContactDelivery,
  onUpdateContactDeliveryChange,
  taxInvoiceRequestMethod,
  onTaxInvoiceRequestMethodChange,
  taxInvoiceRequestEmail,
  onTaxInvoiceRequestEmailChange,
  taxInvoiceRequestNotes,
  onTaxInvoiceRequestNotesChange,
  updateContactTaxInvoiceRequest,
  onUpdateContactTaxInvoiceRequestChange,
  referenceUrls,
  onReferenceUrlsChange,
}: DocumentSettingsBlockProps) {
  const isExpense = configType === "expense";
  const contact = selectedContact ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contactAny = selectedContact as any;

  const showWhtDelivery = isExpense && !!isWht && (
    mode === "edit"
      ? !!onWhtDeliveryMethodChange
      : !!(whtDeliveryMethod || contact?.preferredDeliveryMethod || contact?.deliveryNotes)
  );

  const showTaxInvoice = isExpense && documentType !== "NO_DOCUMENT" && (
    mode === "edit"
      ? !!onTaxInvoiceRequestMethodChange
      : !!(taxInvoiceRequestMethod || contactAny?.taxInvoiceRequestMethod || contactAny?.taxInvoiceRequestNotes)
  );

  const showRefUrls = mode === "edit" ? !!onReferenceUrlsChange : referenceUrls.length > 0;

  if (!showWhtDelivery && !showTaxInvoice && !showRefUrls) return null;

  return (
    <div className="space-y-3">
      {showWhtDelivery && mode === "edit" && onWhtDeliveryMethodChange && (
        <WhtDeliverySection
          mode="edit"
          whtDeliveryMethod={whtDeliveryMethod ?? null}
          onWhtDeliveryMethodChange={onWhtDeliveryMethodChange}
          whtDeliveryEmail={whtDeliveryEmail}
          onWhtDeliveryEmailChange={onWhtDeliveryEmailChange}
          whtDeliveryNotes={whtDeliveryNotes}
          onWhtDeliveryNotesChange={onWhtDeliveryNotesChange}
          updateContactDelivery={updateContactDelivery}
          onUpdateContactDeliveryChange={onUpdateContactDeliveryChange}
          selectedContact={contact}
        />
      )}
      {showWhtDelivery && mode === "view" && (
        <WhtDeliverySection
          mode="view"
          whtDeliveryMethod={whtDeliveryMethod}
          whtDeliveryEmail={whtDeliveryEmail}
          whtDeliveryNotes={whtDeliveryNotes}
          selectedContact={contact}
        />
      )}

      {showTaxInvoice && mode === "edit" && onTaxInvoiceRequestMethodChange && (
        <TaxInvoiceRequestSection
          mode="edit"
          documentType={documentType || "TAX_INVOICE"}
          taxInvoiceRequestMethod={taxInvoiceRequestMethod ?? null}
          onTaxInvoiceRequestMethodChange={onTaxInvoiceRequestMethodChange}
          taxInvoiceRequestEmail={taxInvoiceRequestEmail}
          onTaxInvoiceRequestEmailChange={onTaxInvoiceRequestEmailChange}
          taxInvoiceRequestNotes={taxInvoiceRequestNotes}
          onTaxInvoiceRequestNotesChange={onTaxInvoiceRequestNotesChange}
          updateContactTaxInvoiceRequest={updateContactTaxInvoiceRequest}
          onUpdateContactTaxInvoiceRequestChange={onUpdateContactTaxInvoiceRequestChange}
          selectedContact={contact}
        />
      )}
      {showTaxInvoice && mode === "view" && (
        <TaxInvoiceRequestSection
          mode="view"
          documentType={documentType}
          taxInvoiceRequestMethod={taxInvoiceRequestMethod ?? null}
          taxInvoiceRequestEmail={taxInvoiceRequestEmail ?? null}
          taxInvoiceRequestNotes={taxInvoiceRequestNotes ?? null}
          selectedContact={contact}
        />
      )}

      {showRefUrls && mode === "edit" && onReferenceUrlsChange && (
        <ReferenceUrlsSection
          mode="edit"
          referenceUrls={referenceUrls}
          onReferenceUrlsChange={onReferenceUrlsChange}
        />
      )}
      {showRefUrls && mode === "view" && (
        <ReferenceUrlsSection mode="view" referenceUrls={referenceUrls} />
      )}
    </div>
  );
}
