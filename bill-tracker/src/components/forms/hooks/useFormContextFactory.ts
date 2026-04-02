"use client";

import { useMemo } from "react";
import type { ContactSummary } from "@/types";
import type { TransactionFormContextValue } from "../TransactionFormContext";
import type { ContactFormState, AiFormState } from "./useTransactionFormState";

interface InternalCompanyOption {
  id: string;
  name: string;
  code: string;
}

interface FormContextFactoryParams {
  configType: string;
  mode: string;
  contactState: ContactFormState;
  patchContactState: (patch: Partial<ContactFormState>) => void;
  aiState: AiFormState;
  patchAiState: (patch: Partial<AiFormState>) => void;
  // Contact list (from useContacts)
  contacts: ContactSummary[];
  contactsLoading: boolean;
  refetchContacts: () => void;
  // Account
  selectedAccount: string | null;
  setSelectedAccount: (id: string | null) => void;
  // Internal company
  internalCompanyId: string | null;
  setInternalCompanyId: (id: string | null) => void;
  accessibleCompanies: InternalCompanyOption[];
  // Reference URLs
  referenceUrls: string[];
  setReferenceUrls: (urls: string[]) => void;
}

/**
 * Builds the TransactionFormContextValue from grouped state objects.
 * Centralizes the "can edit" logic: only expenses in create/edit mode get onChange handlers.
 */
export function useFormContextFactory(params: FormContextFactoryParams): TransactionFormContextValue {
  const isEditable = params.mode === "create" || params.mode === "edit";
  const isExpenseEditable = params.configType === "expense" && isEditable;
  const cs = params.contactState;
  const ai = params.aiState;

  return useMemo<TransactionFormContextValue>(() => ({
    contacts: params.contacts,
    contactsLoading: params.contactsLoading,
    selectedContact: cs.selectedContact,
    onContactSelect: (contact) => {
      params.patchContactState({
        selectedContact: contact,
        aiVendorSuggestion: contact ? null : cs.aiVendorSuggestion,
      });
    },
    onContactCreated: (contact) => {
      params.refetchContacts();
      params.patchContactState({
        selectedContact: contact,
        aiVendorSuggestion: null,
      });
    },
    oneTimeContactName: cs.oneTimeContactName,
    onOneTimeContactNameChange: (name: string) => params.patchContactState({ oneTimeContactName: name }),
    aiVendorSuggestion: cs.aiVendorSuggestion,

    selectedAccount: params.selectedAccount,
    onAccountChange: params.setSelectedAccount,
    suggestedAccountId:
      ai.accountSuggestion?.accountId ||
      ai.aiResult?.aiAccountSuggestion?.accountId ||
      undefined,
    suggestedAccountAlternatives: ai.accountSuggestion?.alternatives,

    whtDeliveryMethod: cs.whtDeliveryMethod,
    onWhtDeliveryMethodChange: isExpenseEditable
      ? (v: string | null) => params.patchContactState({ whtDeliveryMethod: v })
      : undefined,
    whtDeliveryEmail: cs.whtDeliveryEmail,
    onWhtDeliveryEmailChange: isExpenseEditable
      ? (v: string | null) => params.patchContactState({ whtDeliveryEmail: v })
      : undefined,
    whtDeliveryNotes: cs.whtDeliveryNotes,
    onWhtDeliveryNotesChange: isExpenseEditable
      ? (v: string | null) => params.patchContactState({ whtDeliveryNotes: v })
      : undefined,
    updateContactDelivery: cs.updateContactDelivery,
    onUpdateContactDeliveryChange: isExpenseEditable
      ? (v: boolean) => params.patchContactState({ updateContactDelivery: v })
      : undefined,

    taxInvoiceRequestMethod: cs.taxInvoiceRequestMethod,
    onTaxInvoiceRequestMethodChange: isExpenseEditable
      ? (v: string | null) => params.patchContactState({ taxInvoiceRequestMethod: v })
      : undefined,
    taxInvoiceRequestEmail: cs.taxInvoiceRequestEmail,
    onTaxInvoiceRequestEmailChange: isExpenseEditable
      ? (v: string | null) => params.patchContactState({ taxInvoiceRequestEmail: v })
      : undefined,
    taxInvoiceRequestNotes: cs.taxInvoiceRequestNotes,
    onTaxInvoiceRequestNotesChange: isExpenseEditable
      ? (v: string | null) => params.patchContactState({ taxInvoiceRequestNotes: v })
      : undefined,
    updateContactTaxInvoiceRequest: cs.updateContactTaxInvoiceRequest,
    onUpdateContactTaxInvoiceRequestChange: isExpenseEditable
      ? (v: boolean) => params.patchContactState({ updateContactTaxInvoiceRequest: v })
      : undefined,
    hasDocument: cs.hasDocument,
    onHasDocumentChange: isExpenseEditable
      ? (v: boolean) => params.patchContactState({ hasDocument: v })
      : undefined,

    internalCompanyId: params.internalCompanyId,
    onInternalCompanyChange: isExpenseEditable ? params.setInternalCompanyId : undefined,
    accessibleCompanies: params.accessibleCompanies,

    referenceUrls: params.referenceUrls,
    onReferenceUrlsChange: isEditable ? params.setReferenceUrls : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    params.contacts, params.contactsLoading,
    cs.selectedContact, cs.oneTimeContactName, cs.aiVendorSuggestion,
    cs.whtDeliveryMethod, cs.whtDeliveryEmail, cs.whtDeliveryNotes, cs.updateContactDelivery,
    cs.taxInvoiceRequestMethod, cs.taxInvoiceRequestEmail, cs.taxInvoiceRequestNotes,
    cs.updateContactTaxInvoiceRequest, cs.hasDocument,
    params.selectedAccount, ai.accountSuggestion, ai.aiResult,
    params.internalCompanyId, params.accessibleCompanies,
    params.referenceUrls,
    isEditable, isExpenseEditable,
  ]);
}
