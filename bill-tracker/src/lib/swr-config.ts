/**
 * SWR Configuration
 * Global fetcher and cache settings for optimal performance
 */

import type { SWRConfiguration } from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export { fetcher };

/**
 * Global SWR configuration
 * - Deduplication: Multiple components requesting same data will share one request
 * - Revalidation: Smart background updates
 * - Error retry: Automatic retry on failure
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 2000,
  focusThrottleInterval: 30_000,
  keepPreviousData: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 10000,
};

/**
 * SWR keys for consistent caching
 */
export const swrKeys = {
  categories: (companyCode: string, type: string) => 
    `/api/${companyCode}/categories?type=${type}`,
  contacts: (companyCode: string) => 
    `/api/contacts?company=${companyCode.toUpperCase()}&limit=10000`,
  expenses: (companyCode: string, params?: string) => 
    `/api/expenses?company=${companyCode}${params ? `&${params}` : ""}`,
  incomes: (companyCode: string, params?: string) => 
    `/api/incomes?company=${companyCode}${params ? `&${params}` : ""}`,
  reimbursements: (companyCode: string, params?: string) => 
    `/api/reimbursement-requests?company=${companyCode}${params ? `&${params}` : ""}`,
  company: (companyCode: string) => 
    `/api/companies?code=${companyCode}`,
};
