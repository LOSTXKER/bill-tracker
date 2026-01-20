"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface TransactionFilters {
  search: string;
  status: string;
  category: string;
  contact: string;
  creator: string;
  dateFrom: string;
  dateTo: string;
  tab: string;  // For draft, pending, rejected tabs
}

export function useTransactionFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Parse current filters from URL
  const filters = useMemo<TransactionFilters>(() => ({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    category: searchParams.get("category") || "",
    contact: searchParams.get("contact") || "",
    creator: searchParams.get("creator") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    tab: searchParams.get("tab") || "",
  }), [searchParams]);

  // Update a single filter
  const updateFilter = useCallback((key: keyof TransactionFilters, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Update multiple filters at once
  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== "");
  }, [filters]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== "").length;
  }, [filters]);

  // Get active filters as array
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== "")
      .map(([key, value]) => ({ key: key as keyof TransactionFilters, value }));
  }, [filters]);

  // Alias for updateFilter (for simpler API)
  const setFilter = updateFilter;

  // Set filter with sorting in a single navigation
  const setFilterWithSort = useCallback((
    key: keyof TransactionFilters, 
    value: string,
    sortBy: string,
    sortOrder: "asc" | "desc"
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    
    // Reset to page 1
    params.delete("page");
    
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  return {
    filters,
    updateFilter,
    setFilter,
    setFilterWithSort,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    activeFilters,
  };
}

// Hook for pagination
export function usePagination() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const page = useMemo(() => {
    return parseInt(searchParams.get("page") || "1");
  }, [searchParams]);

  const limit = useMemo(() => {
    return parseInt(searchParams.get("limit") || "20");
  }, [searchParams]);

  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const setLimit = useCallback((newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.delete("page"); // Reset to page 1 when limit changes
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  return {
    page,
    limit,
    setPage,
    setLimit,
  };
}

// Hook for sorting
export function useSorting(defaultSortBy: string = "createdAt") {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const sortBy = useMemo(() => {
    return searchParams.get("sortBy") || defaultSortBy;
  }, [searchParams, defaultSortBy]);

  const sortOrder = useMemo(() => {
    return (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
  }, [searchParams]);

  const toggleSort = useCallback((field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (sortBy === field) {
      // Toggle order if same field
      params.set("sortOrder", sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New field, default to desc
      params.set("sortBy", field);
      params.set("sortOrder", "desc");
    }
    
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router, sortBy, sortOrder]);

  // Set sorting directly
  const setSorting = useCallback((field: string, order: "asc" | "desc") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", field);
    params.set("sortOrder", order);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  return {
    sortBy,
    sortOrder,
    toggleSort,
    setSorting,
  };
}
