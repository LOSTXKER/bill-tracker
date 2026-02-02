/**
 * Hook for managing status tabs in transaction lists
 * Extracted from TransactionListClient to reduce component complexity
 */

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface StatusTab {
  id: string;
  label: string;
  statuses: string[];
  color?: string;
}

export interface UseTabManagementProps {
  tabs: StatusTab[];
  statusCounts: Record<string, number>;
  currentPath: string;
}

export function useTabManagement({
  tabs,
  statusCounts,
  currentPath,
}: UseTabManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL or default to first tab
  const getActiveTab = useCallback(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const matchingTab = tabs.find(t => t.id === tabParam);
      if (matchingTab) return matchingTab;
    }
    return tabs[0];
  }, [searchParams, tabs]);

  const activeTab = useMemo(() => getActiveTab(), [getActiveTab]);

  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    // Set tab parameter
    if (tabId === tabs[0].id) {
      // Remove tab param for default tab
      newParams.delete("tab");
    } else {
      newParams.set("tab", tabId);
    }
    
    // Reset to first page when changing tabs
    newParams.delete("page");
    
    // Build new URL
    const queryString = newParams.toString();
    const newUrl = queryString ? `${currentPath}?${queryString}` : currentPath;
    
    router.push(newUrl);
  }, [searchParams, tabs, currentPath, router]);

  // Get count for a specific tab
  const getTabCount = useCallback((tab: StatusTab): number => {
    if (tab.statuses.length === 0) {
      // "All" tab - sum all counts
      return Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    }
    
    // Sum counts for statuses in this tab
    return tab.statuses.reduce((sum, status) => {
      return sum + (statusCounts[status] || 0);
    }, 0);
  }, [statusCounts]);

  return {
    activeTab,
    getActiveTab,
    handleTabChange,
    getTabCount,
  };
}
