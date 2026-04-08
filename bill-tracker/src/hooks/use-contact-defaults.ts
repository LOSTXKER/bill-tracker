"use client";

import useSWR from "swr";
import { getErrorMessage } from "@/lib/utils/error-helpers";

export interface TransactionPreset {
  label: string;
  description: string;
  accountId?: string | null;
  categoryId?: string | null;
  vatRate?: number | null;
  whtEnabled?: boolean | null;
  whtRate?: number | null;
  whtType?: string | null;
  documentType?: string | null;
  notes?: string | null;
}

/** @deprecated Use TransactionPreset instead */
export type DescriptionPreset = TransactionPreset;

export interface ContactDefaults {
  defaultVatRate: number | null;
  defaultWhtEnabled: boolean | null;
  defaultWhtRate: number | null;
  defaultWhtType: string | null;
  presets: TransactionPreset[];
  defaultAccountId: string | null;
  defaultAccountCode: string | null;
  defaultAccountName: string | null;
  defaultsLastUpdatedAt: string | null;
  preferredDeliveryMethod: string | null;
  deliveryEmail: string | null;
  deliveryNotes: string | null;
  taxInvoiceRequestMethod: string | null;
  taxInvoiceRequestEmail: string | null;
  taxInvoiceRequestNotes: string | null;
}

export interface ContactWithDefaults {
  id: string;
  name: string;
  taxId: string | null;
  defaultVatRate: number | null;
  defaultWhtEnabled: boolean | null;
  defaultWhtRate: number | null;
  defaultWhtType: string | null;
  descriptionTemplate: string | null;
  descriptionPresets: TransactionPreset[] | unknown;
  defaultAccountId: string | null;
  defaultAccountCode: string | null;
  defaultAccountName: string | null;
  defaultsLastUpdatedAt: string | null;
  preferredDeliveryMethod: string | null;
  deliveryEmail: string | null;
  deliveryNotes: string | null;
  taxInvoiceRequestMethod: string | null;
  taxInvoiceRequestEmail: string | null;
  taxInvoiceRequestNotes: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: {
    contact: ContactWithDefaults;
    hasDefaults: boolean;
  };
  error?: string;
}

interface UseContactDefaultsReturn {
  contact: ContactWithDefaults | null;
  defaults: ContactDefaults | null;
  hasDefaults: boolean;
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
}

function parsePresets(raw: unknown): TransactionPreset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object" && typeof p.label === "string")
    .map((p) => ({
      label: p.label || "",
      description: p.description || "",
      accountId: p.accountId || null,
      categoryId: p.categoryId || null,
      vatRate: p.vatRate ?? null,
      whtEnabled: p.whtEnabled ?? null,
      whtRate: p.whtRate ?? null,
      whtType: p.whtType || null,
      documentType: p.documentType || null,
      notes: p.notes || null,
    }));
}

export function useContactDefaults(
  companyCode: string | null,
  contactId: string | null
): UseContactDefaultsReturn {
  const key = companyCode && contactId
    ? `/api/${companyCode.toUpperCase()}/contacts/${contactId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(key, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const contact = data?.success ? data.data?.contact || null : null;
  const hasDefaults = data?.success ? data.data?.hasDefaults || false : false;

  const presets = contact ? parsePresets(contact.descriptionPresets) : [];

  const defaults: ContactDefaults | null = contact && hasDefaults ? {
    defaultVatRate: contact.defaultVatRate,
    defaultWhtEnabled: contact.defaultWhtEnabled,
    defaultWhtRate: contact.defaultWhtRate,
    defaultWhtType: contact.defaultWhtType,
    presets,
    defaultAccountId: contact.defaultAccountId,
    defaultAccountCode: contact.defaultAccountCode,
    defaultAccountName: contact.defaultAccountName,
    defaultsLastUpdatedAt: contact.defaultsLastUpdatedAt,
    preferredDeliveryMethod: contact.preferredDeliveryMethod,
    deliveryEmail: contact.deliveryEmail,
    deliveryNotes: contact.deliveryNotes,
    taxInvoiceRequestMethod: contact.taxInvoiceRequestMethod,
    taxInvoiceRequestEmail: contact.taxInvoiceRequestEmail,
    taxInvoiceRequestNotes: contact.taxInvoiceRequestNotes,
  } : null;

  return {
    contact,
    defaults,
    hasDefaults,
    isLoading,
    error: error ? getErrorMessage(error, "Failed to fetch contact defaults") : null,
    mutate: () => { mutate(); },
  };
}
