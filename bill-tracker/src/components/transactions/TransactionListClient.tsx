"use client";

import { useState, ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, LucideIcon } from "lucide-react";
import Link from "next/link";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { Pagination } from "@/components/shared/Pagination";
import { BulkActionsBar } from "@/components/transactions/BulkActionsBar";
import { ExportButton } from "@/components/transactions/ExportButton";
import { TransactionPreviewSheet } from "@/components/transactions/TransactionPreviewSheet";
import { BulkEditDialog } from "@/components/transactions/BulkEditDialog";
import { useTransactionFilters, usePagination, useSorting } from "@/hooks/use-transaction-filters";
import { useSelection } from "@/hooks/use-selection";
import { useBulkActions } from "@/hooks/use-bulk-actions";
import { useStatusCalculations } from "@/hooks/use-status-calculations";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { StatusInfo } from "@/lib/constants/transaction";
import { getNextStatus, getStatusLabel, getPreviousStatus, type TransactionWorkflowContext, type NextStatusInfo } from "@/lib/workflow/status-rules";
import { SortableHeader } from "@/components/transactions/SortableHeader";
import { StatusTab, EXPENSE_STATUS_TABS, INCOME_STATUS_TABS } from "@/components/transactions/transaction-list-constants";

// ============================================================================
// Types
// ============================================================================

export type TransactionListItem = Record<string, unknown> & { id: string };

export interface CompanyOption {
  id: string;
  name: string;
  code: string;
}

export interface TransactionListConfig {
  type: "expense" | "income";
  title: string;
  emptyStateTitle: string;
  emptyIcon: LucideIcon;
  apiEndpoint: string;
  captureUrl: string;
  dateField: "billDate" | "receiveDate";
  statusInfo: Record<string, StatusInfo>;
  
  // Table headers configuration
  tableHeaders: TableHeaderConfig[];
  
  // Whether to show category column
  showCategory?: boolean;
  
  // Custom row renderer
  renderRow: (
    item: TransactionListItem,
    companyCode: string,
    selected: boolean,
    onToggle: () => void,
    options?: { 
      currentUserId?: string; 
      canApprove?: boolean; 
      onRefresh?: () => void;
      onPreview?: (id: string) => void;
    }
  ) => ReactNode;
}

export interface TableHeaderConfig {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

interface TabCounts {
  all: number;
  draft: number;
  pending: number;
  active: number;
  ready: number;
  sent: number;
}

interface TransactionListClientProps {
  companyCode: string;
  data: TransactionListItem[];
  total: number;
  config: TransactionListConfig;
  companies?: CompanyOption[];
  currentUserId?: string;
  canApprove?: boolean;
  isOwner?: boolean;  // Owner can change status to any status (forward or backward)
  tabCounts?: TabCounts;
}

// ============================================================================
// Component
// ============================================================================

export function TransactionListClient({
  companyCode,
  data,
  total,
  config,
  companies = [],
  currentUserId,
  canApprove = false,
  isOwner = false,
  tabCounts,
}: TransactionListClientProps) {
  const router = useRouter();
  const { filters, setFilter, setFilterWithSort, updateFilters } = useTransactionFilters();
  const { page, limit, setPage, setLimit } = usePagination();
  const { sortBy, sortOrder, toggleSort } = useSorting("createdAt");
  
  // Selection Hook (Phase 5 Integration)
  const {
    selectedIds,
    setSelectedIds,
    selectedItems,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
  } = useSelection({ data });

  // Bulk Actions Hook (Phase 5 Integration)
  const {
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkInternalCompanyChange,
    handleBulkEdit,
    handleBulkApprove,
    handleBulkReject,
    isPending,
  } = useBulkActions({
    apiEndpoint: config.apiEndpoint,
    selectedIds,
    setSelectedIds,
  });

  // Status Calculations Hook (Phase 5 Integration)
  const {
    selectedStatuses,
    selectedWorkflowContext,
    nextStatus,
    previousStatus,
    currentStatusLabel,
    hasPendingItems,
  } = useStatusCalculations({
    selectedItems,
    transactionType: config.type,
    isOwner,
  });
  
  // Bulk Edit Dialog state
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Preview Sheet state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  const handlePreview = useCallback((id: string) => {
    setPreviewId(id);
    setPreviewOpen(true);
  }, []);

  const handleRefresh = useCallback(() => router.refresh(), [router]);
  
  const statusTabs = config.type === "expense" ? EXPENSE_STATUS_TABS : INCOME_STATUS_TABS;
  
  const getActiveTab = () => {
    if (filters.tab) return filters.tab;
    if (!filters.status) return "all";
    
    const currentStatuses = filters.status.split(",");
    const matchingTab = statusTabs.find(tab => 
      tab.statuses.length > 0 && 
      tab.statuses.every(s => currentStatuses.includes(s)) &&
      currentStatuses.every(s => tab.statuses.includes(s))
    );
    
    return matchingTab?.key || "all";
  };
  
  const activeTab = getActiveTab();
  
  const handleTabChange = (tabKey: string) => {
    const tab = statusTabs.find(t => t.key === tabKey);
    
    if (tabKey === "draft") {
      updateFilters({ status: "", tab: tabKey });
    } else if (tab && tab.statuses.length > 0) {
      updateFilters({ tab: "", status: tab.statuses.join(",") });
    } else {
      updateFilters({ tab: "", status: "" });
    }
  };

  // Note: toggleSelectAll, toggleSelect, clearSelection, selectedItems are now from useSelection hook
  // Note: selectedStatuses, selectedWorkflowContext, nextStatus, previousStatus, currentStatusLabel, hasPendingItems 
  //       are now from useStatusCalculations hook
  // Note: handleBulkDelete, handleBulkStatusChange, handleBulkInternalCompanyChange, handleBulkApprove, 
  //       handleBulkReject, isPending are now from useBulkActions hook

  const statusOptions = Object.entries(config.statusInfo).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  const EmptyIcon = config.emptyIcon;

  const getTabCount = (tab: StatusTab) => {
    if (tabCounts) {
      const key = tab.key as keyof TabCounts;
      const count = tabCounts[key];
      return count ?? null;
    }
    
    if (tab.key === "all") return total;
    
    if (tab.key === "draft") {
      return data.filter(item => 
        item.workflowStatus === "DRAFT" && 
        (item.creator as Record<string, unknown> | undefined)?.id === currentUserId
      ).length;
    }
    
    return data.filter(item => tab.statuses.includes(((item.workflowStatus ?? item.status) as string | undefined) ?? "")).length;
  };

  return (
    <div className="space-y-4">
      {/* Header: Tabs + Filters */}
      <div className="flex flex-col gap-3">
        {/* Status Tabs - Pill Style */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {statusTabs.map((tab) => {
            const count = getTabCount(tab);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
                {count !== null && count > 0 && (
                  <span className={cn(
                    "inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs font-semibold rounded-md",
                    isActive 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <TransactionFilters
          type={config.type}
          statuses={statusOptions}
          hideStatusFilter={true}
          hideStatusBadges={false}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
            <span className="text-xs text-muted-foreground">
              ({total} รายการ)
            </span>
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          <ExportButton
            data={data}
            filename={`${config.type}s-${new Date().toISOString().split("T")[0]}`}
            type={config.type}
          />
        </div>
        <div>
          {data.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <EmptyIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {filters.search || filters.status ? "ไม่พบรายการที่ตรงกับเงื่อนไข" : config.emptyStateTitle}
              </p>
              {!filters.search && !filters.status && (
                <Link href={`/${companyCode.toLowerCase()}/${config.captureUrl}`}>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มรายการแรก
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent group">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === data.length && data.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="เลือกทั้งหมด"
                        />
                      </TableHead>
                      {config.tableHeaders.map((header) => (
                        header.sortable ? (
                          <SortableHeader
                            key={header.key}
                            field={header.key}
                            align={header.align}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={toggleSort}
                          >
                            {header.label}
                          </SortableHeader>
                        ) : (
                          <TableHead
                            key={header.key}
                            className={cn(
                              "text-muted-foreground font-medium",
                              header.align === "center" && "text-center",
                              header.align === "right" && "text-right"
                            )}
                          >
                            {header.label}
                          </TableHead>
                        )
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      config.renderRow(
                        item, 
                        companyCode, 
                        selectedIds.includes(item.id), 
                        () => toggleSelect(item.id),
                        {
                          currentUserId,
                          canApprove,
                          onRefresh: handleRefresh,
                          onPreview: handlePreview,
                        }
                      )
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <Pagination
                page={page}
                limit={limit}
                total={total}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClearSelection={clearSelection}
          onDelete={handleBulkDelete}
          onStatusChange={handleBulkStatusChange}
          selectedStatuses={selectedStatuses}
          nextStatus={nextStatus}
          previousStatus={previousStatus}
          isOwner={isOwner}
          currentStatusLabel={currentStatusLabel}
          onBulkEdit={() => setBulkEditOpen(true)}
          onInternalCompanyChange={config.type === "expense" ? handleBulkInternalCompanyChange : undefined}
          companies={config.type === "expense" ? companies : undefined}
          onBatchApprove={canApprove ? handleBulkApprove : undefined}
          onBatchReject={canApprove ? handleBulkReject : undefined}
          canApprove={canApprove}
          hasPendingItems={hasPendingItems}
        />
      )}

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        transactionType={config.type}
        selectedCount={selectedIds.length}
        companyCode={companyCode}
        onSubmit={handleBulkEdit}
      />

      {/* Transaction Preview Sheet */}
      <TransactionPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        transactionId={previewId}
        transactionType={config.type}
        companyCode={companyCode}
      />
    </div>
  );
}
