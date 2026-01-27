"use client";

import { useState, useTransition, useMemo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, ArrowUpDown, ArrowUp, ArrowDown, LucideIcon } from "lucide-react";
import Link from "next/link";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { Pagination } from "@/components/shared/Pagination";
import { BulkActionsBar } from "@/components/transactions/BulkActionsBar";
import { ExportButton } from "@/components/transactions/ExportButton";
import { useTransactionFilters, usePagination, useSorting } from "@/hooks/use-transaction-filters";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { StatusInfo } from "@/lib/constants/transaction";
import { getNextStatus, getStatusLabel } from "@/lib/workflow/status-rules";

// ============================================================================
// Types
// ============================================================================

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
    item: any, 
    companyCode: string, 
    selected: boolean, 
    onToggle: () => void,
    options?: { 
      currentUserId?: string; 
      canApprove?: boolean; 
      onRefresh?: () => void;
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
  rejected: number;
  waiting_doc: number;
  doc_received?: number; // For expenses
  doc_issued?: number;   // For incomes
  ready: number;
  sent: number;
  recent: null;
}

interface TransactionListClientProps {
  companyCode: string;
  data: any[];
  total: number;
  config: TransactionListConfig;
  companies?: CompanyOption[];
  currentUserId?: string;
  canApprove?: boolean;
  tabCounts?: TabCounts;
}

// ============================================================================
// Component
// ============================================================================

// Status tab configuration
interface StatusTab {
  key: string;
  label: string;
  statuses: string[]; // Statuses to include in this tab
  icon?: string;
  isTabFilter?: boolean; // Use tab parameter instead of status
  isApprovalTab?: boolean; // Show pending approval items
  isRejectedTab?: boolean; // Show rejected items
}

// Expense workflow: ร่าง → รออนุมัติ → จ่ายแล้ว → รอใบกำกับ → (ออก 50 ทวิ) → รอส่งบัญชี → ส่งแล้ว
const EXPENSE_STATUS_TABS: StatusTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: [] },
  { key: "draft", label: "ร่างของฉัน", statuses: ["DRAFT"], isTabFilter: true },
  { key: "pending", label: "รออนุมัติ", statuses: [], isApprovalTab: true },
  { key: "rejected", label: "ถูกปฏิเสธ", statuses: [], isRejectedTab: true },
  { key: "waiting_doc", label: "รอเอกสาร", statuses: ["PAID", "WAITING_TAX_INVOICE", "WHT_PENDING_ISSUE"] },
  { key: "doc_received", label: "ได้เอกสารแล้ว", statuses: ["TAX_INVOICE_RECEIVED", "WHT_ISSUED", "WHT_SENT_TO_VENDOR"] },
  { key: "ready", label: "รอส่งบัญชี", statuses: ["READY_FOR_ACCOUNTING"] },
  { key: "sent", label: "ส่งบัญชีแล้ว", statuses: ["SENT_TO_ACCOUNTANT", "COMPLETED"] },
  { key: "recent", label: "แก้ไขล่าสุด", statuses: [] },
];

// Income workflow: ร่าง → รออนุมัติ → รับเงินแล้ว → รอออกบิล → (รอ 50 ทวิ) → รอส่งบัญชี → ส่งแล้ว
const INCOME_STATUS_TABS: StatusTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: [] },
  { key: "draft", label: "ร่างของฉัน", statuses: ["DRAFT"], isTabFilter: true },
  { key: "pending", label: "รออนุมัติ", statuses: [], isApprovalTab: true },
  { key: "rejected", label: "ถูกปฏิเสธ", statuses: [], isRejectedTab: true },
  { key: "waiting_doc", label: "รอออกบิล", statuses: ["RECEIVED", "NO_INVOICE_NEEDED", "WAITING_INVOICE_ISSUE", "WHT_PENDING_CERT"] },
  { key: "doc_issued", label: "ออกบิลแล้ว", statuses: ["INVOICE_ISSUED", "INVOICE_SENT", "WHT_CERT_RECEIVED"] },
  { key: "ready", label: "รอส่งบัญชี", statuses: ["READY_FOR_ACCOUNTING"] },
  { key: "sent", label: "ส่งบัญชีแล้ว", statuses: ["SENT_TO_ACCOUNTANT", "COMPLETED"] },
  { key: "recent", label: "แก้ไขล่าสุด", statuses: [] },
];

export function TransactionListClient({
  companyCode,
  data,
  total,
  config,
  companies = [],
  currentUserId,
  canApprove = false,
  tabCounts,
}: TransactionListClientProps) {
  const router = useRouter();
  const { filters, setFilter, setFilterWithSort, updateFilters } = useTransactionFilters();
  const { page, limit, setPage, setLimit } = usePagination();
  const { sortBy, sortOrder, toggleSort } = useSorting("createdAt");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  
  const statusTabs = config.type === "expense" ? EXPENSE_STATUS_TABS : INCOME_STATUS_TABS;
  
  // Determine active tab from URL params
  const getActiveTab = () => {
    if (sortBy === "updatedAt") return "recent";
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
  
  // Handle tab change - updates URL which triggers server re-render
  const handleTabChange = (tabKey: string) => {
    const tab = statusTabs.find(t => t.key === tabKey);
    
    if (tabKey === "recent") {
      updateFilters({ tab: "", status: "" });
      // Also update sort separately
      setFilterWithSort("status", "", "updatedAt", "desc");
    } else if (tabKey === "draft" || tabKey === "pending" || tabKey === "rejected") {
      // Use updateFilters to update both status and tab in single navigation
      updateFilters({ status: "", tab: tabKey });
    } else if (tab && tab.statuses.length > 0) {
      updateFilters({ tab: "", status: tab.statuses.join(",") });
    } else {
      // "all" tab - clear all filters
      updateFilters({ tab: "", status: "" });
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  // Calculate unique statuses of selected items for bulk validation
  const selectedStatuses = useMemo(() => {
    const statuses = new Set(
      data
        .filter(item => selectedIds.includes(item.id))
        .map(item => item.workflowStatus || item.status)
    );
    return Array.from(statuses);
  }, [data, selectedIds]);

  // Calculate next status (only if all selected items have the same status)
  const nextStatus = useMemo(() => {
    if (selectedStatuses.length !== 1) return null;
    return getNextStatus(selectedStatuses[0], config.type);
  }, [selectedStatuses, config.type]);

  // Get current status label for display
  const currentStatusLabel = useMemo(() => {
    if (selectedStatuses.length !== 1) return undefined;
    return getStatusLabel(selectedStatuses[0], config.type);
  }, [selectedStatuses, config.type]);

  // Bulk actions - use router.refresh() to get fresh data from server
  const handleBulkDelete = async () => {
    startTransition(async () => {
      try {
        await Promise.all(
          selectedIds.map(id =>
            fetch(`${config.apiEndpoint}/${id}`, { method: "DELETE" })
          )
        );
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        console.error("Bulk delete failed:", error);
      }
    });
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    startTransition(async () => {
      try {
        await Promise.all(
          selectedIds.map(id =>
            fetch(`${config.apiEndpoint}/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              // Use workflowStatus (new field) instead of status (legacy)
              body: JSON.stringify({ workflowStatus: newStatus }),
            })
          )
        );
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        console.error("Bulk status change failed:", error);
      }
    });
  };

  const handleBulkInternalCompanyChange = async (companyId: string | null) => {
    startTransition(async () => {
      try {
        await Promise.all(
          selectedIds.map(id =>
            fetch(`${config.apiEndpoint}/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ internalCompanyId: companyId }),
            })
          )
        );
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        console.error("Bulk internal company change failed:", error);
      }
    });
  };

  const handleBulkApprove = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`${config.apiEndpoint}/batch/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        console.error("Bulk approve failed:", error);
        throw error;
      }
    });
  };

  const handleBulkReject = async (reason: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`${config.apiEndpoint}/batch/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, reason }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        console.error("Bulk reject failed:", error);
        throw error;
      }
    });
  };

  // Check if selected items include pending approval status
  const hasPendingItems = useMemo(() => {
    return data
      .filter(item => selectedIds.includes(item.id))
      .some(item => item.approvalStatus === "PENDING");
  }, [data, selectedIds]);

  const SortableHeader = ({ field, children, align = "left" }: { field: string; children: React.ReactNode; align?: "left" | "center" | "right" }) => (
    <TableHead className={cn(
      "text-muted-foreground font-medium",
      align === "center" && "text-center",
      align === "right" && "text-right"
    )}>
      <button
        onClick={() => toggleSort(field)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          sortBy === field && "text-foreground",
          align === "right" && "ml-auto"
        )}
      >
        {children}
        {sortBy === field ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
        )}
      </button>
    </TableHead>
  );

  const statusOptions = Object.entries(config.statusInfo).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  const EmptyIcon = config.emptyIcon;

  // Count items per tab (for badges) - use server-provided counts if available
  const getTabCount = (tab: StatusTab) => {
    if (tab.key === "recent") return null;
    
    // Use server-provided counts if available
    if (tabCounts) {
      const key = tab.key as keyof TabCounts;
      const count = tabCounts[key];
      return count ?? null;
    }
    
    // Fallback: count from current data (less accurate when filtered)
    if (tab.key === "all") return total;
    
    // For draft tab, only count items created by current user
    if (tab.key === "draft") {
      return data.filter(item => 
        (item.workflowStatus === "DRAFT" || item.status === "DRAFT") && 
        item.creator?.id === currentUserId
      ).length;
    }
    
    // For pending/rejected tabs, count by approvalStatus
    if (tab.isApprovalTab) {
      return data.filter(item => item.approvalStatus === "PENDING").length;
    }
    if (tab.isRejectedTab) {
      return data.filter(item => item.approvalStatus === "REJECTED").length;
    }
    
    return data.filter(item => tab.statuses.includes(item.workflowStatus || item.status)).length;
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
                          onRefresh: () => router.refresh(),
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
          currentStatusLabel={currentStatusLabel}
          onInternalCompanyChange={config.type === "expense" ? handleBulkInternalCompanyChange : undefined}
          companies={config.type === "expense" ? companies : undefined}
          onBatchApprove={canApprove ? handleBulkApprove : undefined}
          onBatchReject={canApprove ? handleBulkReject : undefined}
          canApprove={canApprove}
          hasPendingItems={hasPendingItems}
        />
      )}
    </div>
  );
}
