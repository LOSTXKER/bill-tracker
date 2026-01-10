import useSWR from "swr";
import { swrKeys } from "@/lib/swr-config";

interface ApiResponse {
  success: boolean;
  data?: {
    requests?: any[];
    summary?: any;
  };
  error?: string;
}

interface UseReimbursementsOptions {
  companyCode: string;
  companyId?: string; // Deprecated - use companyCode instead
  myRequests?: boolean; // Deprecated - kept for backwards compatibility
  status?: string;
}

interface UseReimbursementsReturn {
  reimbursements: any[];
  summary: any | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage reimbursement requests
 * Uses SWR for caching, deduplication, and smart revalidation
 * 
 * Note: Anonymous reimbursement system - all requests are public
 * 
 * @param options - Options for fetching reimbursements
 * @returns Object containing reimbursements, summary, loading state, error, and refetch function
 */
export function useReimbursements({
  companyCode,
  status,
}: UseReimbursementsOptions): UseReimbursementsReturn {
  // Build query params using company code (required by withCompanyAccess)
  const params = new URLSearchParams({ company: companyCode });
  if (status) params.append("status", status);

  const key = companyCode
    ? `/api/reimbursement-requests?${params.toString()}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(key, {
    // Don't refetch on window focus for better UX
    revalidateOnFocus: false,
    // Keep data fresh
    dedupingInterval: 2000,
  });

  const reimbursements = data?.success
    ? (data.data?.requests || [])
    : [];

  const refetch = async () => {
    await mutate();
  };

  return {
    reimbursements,
    summary: data?.data?.summary || null,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch reimbursements"
      : null,
    refetch,
  };
}

/**
 * Custom hook to fetch reimbursement summary
 */
export function useReimbursementSummary(companyCode: string) {
  const key = companyCode
    ? `/api/reimbursement-requests/summary?company=${companyCode}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(key, {
    revalidateOnFocus: false,
  });

  return {
    summary: data?.data?.summary || null,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch summary"
      : null,
    refetch: async () => {
      await mutate();
    },
  };
}
