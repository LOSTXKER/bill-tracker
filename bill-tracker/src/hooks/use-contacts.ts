"use client";

import useSWR from "swr";
import type { ContactSummary } from "@/types";
import { swrKeys } from "@/lib/swr-config";

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

  const contacts = data?.success ? (data.data?.contacts || []) : [];

  const refetch = async () => {
    await mutate();
  };

  return {
    contacts,
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch contacts") : null,
    refetch,
  };
}
