"use client";

import useSWR from "swr";

/**
 * Contact defaults for transactions
 */
export interface ContactDefaults {
  defaultVatRate: number | null;
  defaultWhtEnabled: boolean | null;
  defaultWhtRate: number | null;
  defaultWhtType: string | null;
  descriptionTemplate: string | null;
  defaultsLastUpdatedAt: string | null;
}

/**
 * Contact data with defaults
 */
export interface ContactWithDefaults {
  id: string;
  name: string;
  taxId: string | null;
  defaultVatRate: number | null;
  defaultWhtEnabled: boolean | null;
  defaultWhtRate: number | null;
  defaultWhtType: string | null;
  descriptionTemplate: string | null;
  defaultsLastUpdatedAt: string | null;
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

/**
 * Custom hook to fetch contact defaults when a contact is selected
 * 
 * @param companyCode - The company code
 * @param contactId - The contact ID to fetch defaults for
 * @returns Object containing contact data, defaults, loading state, and error
 */
export function useContactDefaults(
  companyCode: string | null,
  contactId: string | null
): UseContactDefaultsReturn {
  // Only fetch when both companyCode and contactId are provided
  const key = companyCode && contactId 
    ? `/api/${companyCode.toUpperCase()}/contacts/${contactId}` 
    : null;

  const { data, error, isLoading } = useSWR<ApiResponse>(key, {
    // Keep defaults cached for 5 minutes
    dedupingInterval: 5 * 60 * 1000,
    // Don't refetch on window focus
    revalidateOnFocus: false,
  });

  const contact = data?.success ? data.data?.contact || null : null;
  const hasDefaults = data?.success ? data.data?.hasDefaults || false : false;

  // Extract defaults from contact
  const defaults: ContactDefaults | null = contact && hasDefaults ? {
    defaultVatRate: contact.defaultVatRate,
    defaultWhtEnabled: contact.defaultWhtEnabled,
    defaultWhtRate: contact.defaultWhtRate,
    defaultWhtType: contact.defaultWhtType,
    descriptionTemplate: contact.descriptionTemplate,
    defaultsLastUpdatedAt: contact.defaultsLastUpdatedAt,
  } : null;

  return {
    contact,
    defaults,
    hasDefaults,
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch contact defaults") : null,
  };
}
