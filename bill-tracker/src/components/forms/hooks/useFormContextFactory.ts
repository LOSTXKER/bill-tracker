"use client";

import { useMemo } from "react";
import type { ContactSummary } from "@/types";
import type { TransactionFormContextValue } from "../TransactionFormContext";
import type { AiVendorSuggestion } from "../shared/ContactSelector";

interface InternalCompanyOption {
  id: string;
  name: string;
  code: string;
}

interface FormContextFactoryParams {
  configType: string;
  mode: string;
  // Contact
  contacts: ContactSummary[];
  contactsLoading: boolean;
  selectedContact: ContactSummary | null;
  setSelectedContact: (c: ContactSummary | null) => void;
  refetchContacts: () => void;
  oneTimeContactName: string;
  setOneTimeContactName: (n: string) => void;
  aiVendorSuggestion: AiVendorSuggestion | null;
  setAiVendorSuggestion: (v: AiVendorSuggestion | null) => void;
  // Account
  selectedAccount: string | null;
  setSelectedAccount: (id: string | null) => void;
  accountSuggestion: { accountId: string | null; alternatives?: Array<{ accountId: string; accountCode: string; accountName: string; confidence: number; reason: string }> } | null;
  aiResult: { aiAccountSuggestion?: { accountId: string | null } | null } | null;
  // WHT delivery
  whtDeliveryMethod: string | null;
  setWhtDeliveryMethod: (v: string | null) => void;
  whtDeliveryEmail: string | null;
  setWhtDeliveryEmail: (v: string | null) => void;
  whtDeliveryNotes: string | null;
  setWhtDeliveryNotes: (v: string | null) => void;
  updateContactDelivery: boolean;
  setUpdateContactDelivery: (v: boolean) => void;
  // Tax invoice
  taxInvoiceRequestMethod: string | null;
  setTaxInvoiceRequestMethod: (v: string | null) => void;
  taxInvoiceRequestEmail: string | null;
  setTaxInvoiceRequestEmail: (v: string | null) => void;
  taxInvoiceRequestNotes: string | null;
  setTaxInvoiceRequestNotes: (v: string | null) => void;
  updateContactTaxInvoiceRequest: boolean;
  setUpdateContactTaxInvoiceRequest: (v: boolean) => void;
  // Internal company
  internalCompanyId: string | null;
  setInternalCompanyId: (id: string | null) => void;
  accessibleCompanies: InternalCompanyOption[];
  // Reference URLs
  referenceUrls: string[];
  setReferenceUrls: (urls: string[]) => void;
}

/**
 * Builds the TransactionFormContextValue from all the state slices.
 * Centralizes the "can edit" logic: only expenses in create/edit mode get onChange handlers.
 */
export function useFormContextFactory(params: FormContextFactoryParams): TransactionFormContextValue {
  const isEditable = params.mode === "create" || params.mode === "edit";
  const isExpenseEditable = params.configType === "expense" && isEditable;

  return useMemo<TransactionFormContextValue>(() => ({
    contacts: params.contacts,
    contactsLoading: params.contactsLoading,
    selectedContact: params.selectedContact,
    onContactSelect: (contact) => {
      params.setSelectedContact(contact);
      if (contact) params.setAiVendorSuggestion(null);
    },
    onContactCreated: (contact) => {
      params.refetchContacts();
      params.setSelectedContact(contact);
      params.setAiVendorSuggestion(null);
    },
    oneTimeContactName: params.oneTimeContactName,
    onOneTimeContactNameChange: params.setOneTimeContactName,
    aiVendorSuggestion: params.aiVendorSuggestion,

    selectedAccount: params.selectedAccount,
    onAccountChange: params.setSelectedAccount,
    suggestedAccountId:
      params.accountSuggestion?.accountId ||
      params.aiResult?.aiAccountSuggestion?.accountId ||
      undefined,
    suggestedAccountAlternatives: params.accountSuggestion?.alternatives,

    whtDeliveryMethod: params.whtDeliveryMethod,
    onWhtDeliveryMethodChange: isExpenseEditable ? params.setWhtDeliveryMethod : undefined,
    whtDeliveryEmail: params.whtDeliveryEmail,
    onWhtDeliveryEmailChange: isExpenseEditable ? params.setWhtDeliveryEmail : undefined,
    whtDeliveryNotes: params.whtDeliveryNotes,
    onWhtDeliveryNotesChange: isExpenseEditable ? params.setWhtDeliveryNotes : undefined,
    updateContactDelivery: params.updateContactDelivery,
    onUpdateContactDeliveryChange: isExpenseEditable ? params.setUpdateContactDelivery : undefined,

    taxInvoiceRequestMethod: params.taxInvoiceRequestMethod,
    onTaxInvoiceRequestMethodChange: isExpenseEditable ? params.setTaxInvoiceRequestMethod : undefined,
    taxInvoiceRequestEmail: params.taxInvoiceRequestEmail,
    onTaxInvoiceRequestEmailChange: isExpenseEditable ? params.setTaxInvoiceRequestEmail : undefined,
    taxInvoiceRequestNotes: params.taxInvoiceRequestNotes,
    onTaxInvoiceRequestNotesChange: isExpenseEditable ? params.setTaxInvoiceRequestNotes : undefined,
    updateContactTaxInvoiceRequest: params.updateContactTaxInvoiceRequest,
    onUpdateContactTaxInvoiceRequestChange: isExpenseEditable ? params.setUpdateContactTaxInvoiceRequest : undefined,

    internalCompanyId: params.internalCompanyId,
    onInternalCompanyChange: isExpenseEditable ? params.setInternalCompanyId : undefined,
    accessibleCompanies: params.accessibleCompanies,

    referenceUrls: params.referenceUrls,
    onReferenceUrlsChange: isEditable ? params.setReferenceUrls : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    params.contacts, params.contactsLoading, params.selectedContact,
    params.oneTimeContactName, params.aiVendorSuggestion,
    params.selectedAccount, params.accountSuggestion, params.aiResult,
    params.whtDeliveryMethod, params.whtDeliveryEmail, params.whtDeliveryNotes,
    params.updateContactDelivery,
    params.taxInvoiceRequestMethod, params.taxInvoiceRequestEmail, params.taxInvoiceRequestNotes,
    params.updateContactTaxInvoiceRequest,
    params.internalCompanyId, params.accessibleCompanies,
    params.referenceUrls,
    isEditable, isExpenseEditable,
  ]);
}
