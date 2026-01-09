/**
 * SWR Configuration
 * Global fetcher and cache settings for optimal performance
 */

import type { SWRConfiguration } from "swr";

/**
 * Default fetcher for SWR
 * Handles JSON responses and error handling
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }
  
  return res.json();
};

/**
 * Global SWR configuration
 * - Deduplication: Multiple components requesting same data will share one request
 * - Revalidation: Smart background updates
 * - Error retry: Automatic retry on failure
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  // Revalidate on focus after 5 minutes
  focusThrottleInterval: 5 * 60 * 1000,
  // Keep previous data while revalidating
  keepPreviousData: true,
  // Don't revalidate on focus for better UX
  revalidateOnFocus: false,
  // Revalidate on reconnect
  revalidateOnReconnect: true,
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  // Loading timeout
  loadingTimeout: 10000,
};

/**
 * SWR keys for consistent caching
 */
export const swrKeys = {
  categories: (companyCode: string, type: string) => 
    `/api/${companyCode}/categories?type=${type}`,
  contacts: (companyCode: string) => 
    `/api/contacts?company=${companyCode.toUpperCase()}`,
  expenses: (companyCode: string, params?: string) => 
    `/api/expenses?company=${companyCode}${params ? `&${params}` : ""}`,
  incomes: (companyCode: string, params?: string) => 
    `/api/incomes?company=${companyCode}${params ? `&${params}` : ""}`,
  reimbursements: (companyCode: string, params?: string) => 
    `/api/reimbursement-requests?company=${companyCode}${params ? `&${params}` : ""}`,
  company: (companyCode: string) => 
    `/api/companies?code=${companyCode}`,
};
