"use client";

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// Types
// =============================================================================

export interface SidebarBadges {
  pendingApprovals: number;
  pendingReimbursements: number;
  pendingSettlements: number;
  pendingWhtDeliveries: number;
  unreadNotifications: number;
}

interface UseSidebarBadgesOptions {
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollInterval?: number;
  /** Whether to enable polling (default: true) */
  enablePolling?: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useSidebarBadges(
  companyCode: string,
  options: UseSidebarBadgesOptions = {}
) {
  const { pollInterval = 30000, enablePolling = true } = options;

  const [badges, setBadges] = useState<SidebarBadges>({
    pendingApprovals: 0,
    pendingReimbursements: 0,
    pendingSettlements: 0,
    pendingWhtDeliveries: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch badges from API
  const fetchBadges = useCallback(async () => {
    if (!companyCode) return;

    try {
      const res = await fetch(`/api/${companyCode}/sidebar-badges`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setBadges(data.data);
          setError(null);
        }
      } else {
        // Don't set error for normal failures, just keep previous state
        console.warn("Failed to fetch sidebar badges:", res.statusText);
      }
    } catch (err) {
      console.error("Failed to fetch sidebar badges:", err);
      // Don't set error state to avoid UI disruption
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  // Initial fetch and polling
  useEffect(() => {
    fetchBadges();

    if (enablePolling && pollInterval > 0) {
      const interval = setInterval(fetchBadges, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBadges, pollInterval, enablePolling]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    return fetchBadges();
  }, [fetchBadges]);

  // Calculate total badge count (excluding notifications which are shown separately)
  const totalCount = badges.pendingApprovals + badges.pendingReimbursements + badges.pendingSettlements;

  return {
    badges,
    loading,
    error,
    refresh,
    totalCount,
  };
}
