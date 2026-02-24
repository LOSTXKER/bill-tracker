"use client";

import useSWR from "swr";

// =============================================================================
// Types
// =============================================================================

export interface SidebarBadges {
  pendingApprovals: number;
  pendingReimbursements: number;
  pendingSettlements: number;
  pendingTaxInvoices: number;
  pendingWhtDeliveries: number;
  unreadNotifications: number;
}

interface UseSidebarBadgesOptions {
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollInterval?: number;
  /** Whether to enable polling (default: true) */
  enablePolling?: boolean;
}

const DEFAULT_BADGES: SidebarBadges = {
  pendingApprovals: 0,
  pendingReimbursements: 0,
  pendingSettlements: 0,
  pendingTaxInvoices: 0,
  pendingWhtDeliveries: 0,
  unreadNotifications: 0,
};

// =============================================================================
// Hook
// =============================================================================

export function useSidebarBadges(
  companyCode: string,
  options: UseSidebarBadgesOptions = {}
) {
  const { pollInterval = 30000, enablePolling = true } = options;

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: SidebarBadges }>(
    companyCode ? `/api/${companyCode}/sidebar-badges` : null,
    {
      refreshInterval: enablePolling ? pollInterval : 0,
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  const badges: SidebarBadges = data?.data || DEFAULT_BADGES;

  const totalCount =
    badges.pendingApprovals +
    badges.pendingReimbursements +
    badges.pendingSettlements;

  return {
    badges,
    loading: isLoading,
    error: error?.message || null,
    refresh: mutate,
    totalCount,
  };
}
