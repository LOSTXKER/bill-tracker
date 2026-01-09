"use client";

import useSWR from "swr";
import type { CategorySummary } from "@/types";
import { swrKeys } from "@/lib/swr-config";

type CategoryType = "EXPENSE" | "INCOME";

interface ApiResponse {
  success: boolean;
  data?: {
    categories: CategorySummary[];
  };
  // Fallback for old format
  [key: string]: unknown;
}

interface UseCategoriesReturn {
  categories: CategorySummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage categories for a company
 * Uses SWR for caching, deduplication, and smart revalidation
 * 
 * @param companyCode - The company code to fetch categories for
 * @param type - The category type (EXPENSE or INCOME)
 * @returns Object containing categories, loading state, error, and refetch function
 */
export function useCategories(
  companyCode: string,
  type: CategoryType
): UseCategoriesReturn {
  const key = companyCode ? swrKeys.categories(companyCode, type) : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(key, {
    // Keep categories cached for 5 minutes
    dedupingInterval: 5 * 60 * 1000,
    // Don't refetch on window focus (categories rarely change)
    revalidateOnFocus: false,
  });

  // Handle both old format (data array) and new format (data.data.categories)
  const categoriesData = data?.data?.categories || (Array.isArray(data) ? data : []);
  // Filter only active categories
  const categories = categoriesData.filter((cat: CategorySummary) => cat.isActive);

  const refetch = async () => {
    await mutate();
  };

  return {
    categories,
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch categories") : null,
    refetch,
  };
}
