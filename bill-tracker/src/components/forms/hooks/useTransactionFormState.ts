"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContactSummary } from "@/types";
import type { MultiDocAnalysisResult } from "../shared/InputMethodSection";

// =============================================================================
// Types
// =============================================================================

export interface AiVendorSuggestion {
  name: string;
  taxId?: string | null;
  branchNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface AccountSuggestion {
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  confidence: number;
  reason: string;
  alternatives?: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason: string;
  }>;
}

export type CurrencyConversionValue = {
  detected: boolean;
  currency: string | null;
  originalAmount: number | null;
  convertedAmount: number | null;
  exchangeRate: number | null;
  conversionNote: string | null;
};

export interface ContactFormState {
  selectedContact: ContactSummary | null;
  oneTimeContactName: string;
  pendingContactId: string | null;
  aiVendorSuggestion: AiVendorSuggestion | null;
  whtDeliveryMethod: string | null;
  whtDeliveryEmail: string | null;
  whtDeliveryNotes: string | null;
  updateContactDelivery: boolean;
  taxInvoiceRequestMethod: string | null;
  taxInvoiceRequestEmail: string | null;
  taxInvoiceRequestNotes: string | null;
  updateContactTaxInvoiceRequest: boolean;
  hasDocument: boolean;
}

export interface CategorySuggestion {
  categoryId: string | null;
  categoryName: string | null;
  groupName: string | null;
  confidence: number;
  reason: string;
  alternatives?: Array<{
    categoryId: string;
    categoryName: string;
    groupName: string;
    confidence: number;
    reason: string;
  }>;
}

export interface AiFormState {
  aiResult: MultiDocAnalysisResult | null;
  aiApplied: boolean;
  accountSuggestion: AccountSuggestion | null;
  categorySuggestion: CategorySuggestion | null;
  currencyConversion: CurrencyConversionValue | null;
}

// =============================================================================
// Initial Values
// =============================================================================

export const INITIAL_CONTACT_STATE: ContactFormState = {
  selectedContact: null,
  oneTimeContactName: "",
  pendingContactId: null,
  aiVendorSuggestion: null,
  whtDeliveryMethod: null,
  whtDeliveryEmail: null,
  whtDeliveryNotes: null,
  updateContactDelivery: false,
  taxInvoiceRequestMethod: null,
  taxInvoiceRequestEmail: null,
  taxInvoiceRequestNotes: null,
  updateContactTaxInvoiceRequest: false,
  hasDocument: false,
};

export const INITIAL_AI_STATE: AiFormState = {
  aiResult: null,
  aiApplied: false,
  accountSuggestion: null,
  categorySuggestion: null,
  currencyConversion: null,
};

// =============================================================================
// Hook
// =============================================================================

interface UseTransactionFormStateOptions {
  configType: "expense" | "income";
  mode: "create" | "view" | "edit";
  contacts: ContactSummary[];
}

export function useTransactionFormState({
  configType,
  mode,
  contacts,
}: UseTransactionFormStateOptions) {
  const [contactState, setContactState] = useState<ContactFormState>(INITIAL_CONTACT_STATE);
  const [aiState, setAiState] = useState<AiFormState>(INITIAL_AI_STATE);

  const patchContactState = useCallback((patch: Partial<ContactFormState>) => {
    setContactState(prev => ({ ...prev, ...patch }));
  }, []);

  const patchAiState = useCallback((patch: Partial<AiFormState>) => {
    setAiState(prev => ({ ...prev, ...patch }));
  }, []);

  // -------------------------------------------------------------------------
  // Resolve pending contact when contacts list loads
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (contactState.pendingContactId && contacts.length > 0 && !contactState.selectedContact) {
      const contact = contacts.find((c) => c.id === contactState.pendingContactId);
      if (contact) {
        setContactState(prev => ({
          ...prev,
          selectedContact: contact,
          pendingContactId: null,
        }));
      }
    }
  }, [contactState.pendingContactId, contacts, contactState.selectedContact]);

  return {
    contactState,
    setContactState,
    patchContactState,
    aiState,
    setAiState,
    patchAiState,
  };
}
