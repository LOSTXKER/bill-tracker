"use client";

import useSWR from "swr";
import { getErrorMessage } from "@/lib/utils/error-helpers";

export interface DescriptionPreset {
  label: string;
  description: string;
  accountId?: string | null;
  categoryId?: string | null;
}

export interface ContactDefaults {
  defaultVatRate: number | null;
  defaultWhtEnabled: boolean | null;
  defaultWhtRate: number | null;
  defaultWhtType: string | null;
  descriptionTemplate: string | null;
  descriptionPresets: DescriptionPreset[];
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
  descriptionPresets: DescriptionPreset[] | unknown;
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
}

function parsePresets(raw: unknown): DescriptionPreset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object" && typeof p.label === "string")
    .map((p) => ({
      label: p.label || "",
      description: p.description || "",
      accountId: p.accountId || null,
      categoryId: p.categoryId || null,
    }));
}

export function useContactDefaults(
  companyCode: string | null,
  contactId: string | null
): UseContactDefaultsReturn {
  const key = companyCode && contactId
    ? `/api/${companyCode.toUpperCase()}/contacts/${contactId}`
    : null;

  const { data, error, isLoading } = useSWR<ApiResponse>(key, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const contact = data?.success ? data.data?.contact || null : null;
  const hasDefaults = data?.success ? data.data?.hasDefaults || false : false;

  const presets = contact ? parsePresets(contact.descriptionPresets) : [];

  // Auto-migrate legacy descriptionTemplate
  if (presets.length === 0 && contact?.descriptionTemplate) {
    presets.push({
      label: contact.descriptionTemplate,
      description: contact.descriptionTemplate,
      accountId: null,
    });
  }

  const defaults: ContactDefaults | null = contact && hasDefaults ? {
    defaultVatRate: contact.defaultVatRate,
    defaultWhtEnabled: contact.defaultWhtEnabled,
    defaultWhtRate: contact.defaultWhtRate,
    defaultWhtType: contact.defaultWhtType,
    descriptionTemplate: contact.descriptionTemplate,
    descriptionPresets: presets,
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
  };
}
