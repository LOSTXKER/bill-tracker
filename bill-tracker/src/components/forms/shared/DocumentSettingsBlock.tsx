"use client";

import type { ContactSummary } from "@/types";
import { WhtDeliverySection } from "./WhtDeliverySection";
import { TaxInvoiceRequestSection } from "./TaxInvoiceRequestSection";
import { ReferenceUrlsSection } from "./ReferenceUrlsSection";

interface DocumentSettingsEditProps {
  mode: "edit";
  configType: "expense" | "income";
  documentType?: string;
  isWht?: boolean;
  referenceUrls: string[];
  onReferenceUrlsChange?: (urls: string[]) => void;
}

interface DocumentSettingsViewProps {
  mode: "view";
  configType: "expense" | "income";
  documentType?: string;
  isWht?: boolean;
  selectedContact: ContactSummary | null;
  whtDeliveryMethod?: string | null;
  whtDeliveryEmail?: string | null;
  whtDeliveryNotes?: string | null;
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
  hasDocument?: boolean;
  referenceUrls: string[];
}

type DocumentSettingsBlockProps = DocumentSettingsEditProps | DocumentSettingsViewProps;

export function DocumentSettingsBlock(props: DocumentSettingsBlockProps) {
  const { mode, configType, documentType, isWht, referenceUrls } = props;
  const isExpense = configType === "expense";

  if (mode === "edit") {
    const showWhtDelivery = isExpense && !!isWht;
    const showTaxInvoice = isExpense && documentType !== "NO_DOCUMENT";
    const showRefUrls = !!props.onReferenceUrlsChange;

    if (!showWhtDelivery && !showTaxInvoice && !showRefUrls) return null;

    return (
      <div className="space-y-3">
        {showWhtDelivery && <WhtDeliverySection mode="edit" />}
        {showTaxInvoice && (
          <TaxInvoiceRequestSection
            mode="edit"
            documentType={documentType || "TAX_INVOICE"}
          />
        )}
        {showRefUrls && props.onReferenceUrlsChange && (
          <ReferenceUrlsSection
            mode="edit"
            referenceUrls={referenceUrls}
            onReferenceUrlsChange={props.onReferenceUrlsChange}
          />
        )}
      </div>
    );
  }

  const contact = props.selectedContact;
  const showWhtDelivery = isExpense && !!isWht &&
    !!(props.whtDeliveryMethod || contact?.preferredDeliveryMethod || contact?.deliveryNotes);
  const showTaxInvoice = isExpense && documentType !== "NO_DOCUMENT" &&
    !!(props.taxInvoiceRequestMethod || contact?.taxInvoiceRequestMethod || contact?.taxInvoiceRequestNotes || props.hasDocument);
  const showRefUrls = referenceUrls.length > 0;

  if (!showWhtDelivery && !showTaxInvoice && !showRefUrls) return null;

  return (
    <div className="space-y-3">
      {showWhtDelivery && (
        <WhtDeliverySection
          mode="view"
          whtDeliveryMethod={props.whtDeliveryMethod}
          whtDeliveryEmail={props.whtDeliveryEmail}
          whtDeliveryNotes={props.whtDeliveryNotes}
          selectedContact={contact}
        />
      )}
      {showTaxInvoice && (
        <TaxInvoiceRequestSection
          mode="view"
          documentType={documentType}
          taxInvoiceRequestMethod={props.taxInvoiceRequestMethod}
          taxInvoiceRequestEmail={props.taxInvoiceRequestEmail}
          taxInvoiceRequestNotes={props.taxInvoiceRequestNotes}
          selectedContact={contact}
          hasDocument={props.hasDocument}
        />
      )}
      {showRefUrls && (
        <ReferenceUrlsSection mode="view" referenceUrls={referenceUrls} />
      )}
    </div>
  );
}
