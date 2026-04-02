"use client";

import { useCallback } from "react";
import useSWR from "swr";
import type { ContactSummary } from "@/types";
import { swrKeys } from "@/lib/swr-config";
import { getErrorMessage } from "@/lib/utils/error-helpers";

const EMPTY_CONTACTS: ContactSummary[] = [];

interface ApiResponse {
  success: boolean;
  data?: {
    contacts: ContactSummary[];
  };
}

interface UseContactsReturn {
  contacts: ContactSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage contacts for a company
 * Uses SWR for caching, deduplication, and smart revalidation
 * 
 * @param companyCode - The company code to fetch contacts for
 * @returns Object containing contacts, loading state, error, and refetch function
 */
export function useContacts(companyCode: string): UseContactsReturn {
  const key = companyCode ? swrKeys.contacts(companyCode) : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(key, {
    // Keep contacts cached for 5 minutes
    dedupingInterval: 5 * 60 * 1000,
    // Don't refetch on window focus (contacts rarely change)
    revalidateOnFocus: false,
  });

  const contacts = data?.success ? (data.data?.contacts ?? EMPTY_CONTACTS) : EMPTY_CONTACTS;

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    contacts,
    isLoading,
    error: error ? getErrorMessage(error, "Failed to fetch contacts") : null,
    refetch,
  };
}
