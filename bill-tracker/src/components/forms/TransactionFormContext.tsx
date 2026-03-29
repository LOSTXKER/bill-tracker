"use client";
import { createContext, useContext } from "react";
import type { ContactSummary } from "@/types";
import type { AiVendorSuggestion } from "./shared/ContactSelector";
import type { InternalCompanyOption } from "./shared/transaction-fields-types";

export interface TransactionFormContextValue {
  // Contact slice
  contacts: ContactSummary[];
  contactsLoading: boolean;
  selectedContact: ContactSummary | null;
  onContactSelect: (contact: ContactSummary | null) => void;
  onContactCreated?: (contact: ContactSummary) => void;
  oneTimeContactName?: string;
  onOneTimeContactNameChange?: (name: string) => void;
  aiVendorSuggestion?: AiVendorSuggestion | null;

  // Account slice
  selectedAccount: string | null;
  onAccountChange: (value: string | null) => void;
  suggestedAccountId?: string;
  suggestedAccountAlternatives?: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason: string;
  }>;

  // WHT delivery slice
  whtDeliveryMethod?: string | null;
  onWhtDeliveryMethodChange?: (method: string | null) => void;
  whtDeliveryEmail?: string | null;
  onWhtDeliveryEmailChange?: (email: string | null) => void;
  whtDeliveryNotes?: string | null;
  onWhtDeliveryNotesChange?: (notes: string | null) => void;
  updateContactDelivery?: boolean;
  onUpdateContactDeliveryChange?: (update: boolean) => void;

  // Tax invoice slice
  taxInvoiceRequestMethod?: string | null;
  onTaxInvoiceRequestMethodChange?: (method: string | null) => void;
  taxInvoiceRequestEmail?: string | null;
  onTaxInvoiceRequestEmailChange?: (email: string | null) => void;
  taxInvoiceRequestNotes?: string | null;
  onTaxInvoiceRequestNotesChange?: (notes: string | null) => void;
  updateContactTaxInvoiceRequest?: boolean;
  onUpdateContactTaxInvoiceRequestChange?: (update: boolean) => void;

  // Internal company slice
  internalCompanyId?: string | null;
  onInternalCompanyChange?: (id: string | null) => void;
  accessibleCompanies?: InternalCompanyOption[];

  // Reference URLs
  referenceUrls?: string[];
  onReferenceUrlsChange?: (urls: string[]) => void;
}

const TransactionFormContext = createContext<TransactionFormContextValue | null>(null);

export function TransactionFormProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TransactionFormContextValue;
}) {
  return (
    <TransactionFormContext.Provider value={value}>
      {children}
    </TransactionFormContext.Provider>
  );
}

export function useTransactionFormContext(): TransactionFormContextValue {
  const ctx = useContext(TransactionFormContext);
  if (!ctx) throw new Error("useTransactionFormContext must be used within TransactionFormProvider");
  return ctx;
}
