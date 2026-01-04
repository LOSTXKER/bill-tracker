"use client";

import { useState, useEffect } from "react";
import type { CategorySummary } from "@/types";

type CategoryType = "EXPENSE" | "INCOME";

interface UseCategoriesReturn {
  categories: CategorySummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage categories for a company
 * @param companyCode - The company code to fetch categories for
 * @param type - The category type (EXPENSE or INCOME)
 * @returns Object containing categories, loading state, error, and refetch function
 */
export function useCategories(
  companyCode: string,
  type: CategoryType
): UseCategoriesReturn {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!companyCode) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/${companyCode}/categories?type=${type}`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter only active categories
        const activeCategories = data.filter((cat: CategorySummary) => cat.isActive);
        setCategories(activeCategories);
      } else {
        setError("Failed to fetch categories");
        setCategories([]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [companyCode, type]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
