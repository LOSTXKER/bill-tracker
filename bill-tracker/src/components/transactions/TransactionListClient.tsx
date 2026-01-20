"use client";

import { useEffect, useState, useTransition, ReactNode, useRef } from "react";
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

// ============================================================================
// Types
// ============================================================================

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
  renderRow: (item: any, companyCode: string, selected: boolean, onToggle: () => void) => ReactNode;
}

export interface TableHeaderConfig {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

interface TransactionListClientProps {
  companyCode: string;
  initialData: any[];
  initialTotal: number;
  config: TransactionListConfig;
  fetchData: (params: any) => Promise<{ data: any[]; total: number }>;
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
  initialData,
  initialTotal,
  config,
  fetchData,
}: TransactionListClientProps) {
  const router = useRouter();
  const { filters, setFilter, setFilterWithSort } = useTransactionFilters();
  const { page, limit, setPage, setLimit } = usePagination();
  // Use the correct default sort field based on transaction type
  const { sortBy, sortOrder, toggleSort } = useSorting(config.dateField);
  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const isInitialMount = useRef(true);
  
  const statusTabs = config.type === "expense" ? EXPENSE_STATUS_TABS : INCOME_STATUS_TABS;
  
  // Sync activeTab with URL status filter
  useEffect(() => {
    if (sortBy === "updatedAt") {
      setActiveTab("recent");
      return;
    }
    
    // Check for tab filter
    if (filters.tab) {
      setActiveTab(filters.tab);
      return;
    }
    
    if (!filters.status) {
      setActiveTab("all");
      return;
    }
    
    // Find which tab matches the current status filter
    const currentStatuses = filters.status.split(",");
    const matchingTab = statusTabs.find(tab => 
      tab.statuses.length > 0 && 
      tab.statuses.every(s => currentStatuses.includes(s)) &&
      currentStatuses.every(s => tab.statuses.includes(s))
    );
    
    if (matchingTab) {
      setActiveTab(matchingTab.key);
    }
  }, [filters.status, filters.tab, sortBy, statusTabs]);
  
  // Handle tab change - use setFilterWithSort for single navigation
  const handleTabChange = (tabKey: string) => {
    const tab = statusTabs.find(t => t.key === tabKey);
    
    if (tabKey === "recent") {
      // Sort by updatedAt desc, clear status filter
      setFilter("tab", "");
      setFilterWithSort("status", "", "updatedAt", "desc");
    } else if (tabKey === "draft" || tabKey === "pending" || tabKey === "rejected") {
      // Use tab-based API filtering
      setFilter("status", "");
      setFilter("tab", tabKey);
    } else if (tab && tab.statuses.length > 0) {
      // Filter by statuses in this tab
      setFilter("tab", "");
      setFilterWithSort("status", tab.statuses.join(","), config.dateField, "desc");
    } else {
      // All: clear filters
      setFilter("tab", "");
      setFilterWithSort("status", "", config.dateField, "desc");
    }
  };

  // Fetch data when filters change (skip initial mount since we have initialData)
  useEffect(() => {
    // Skip the first render - we already have data from server
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    startTransition(async () => {
      const result = await fetchData({
        companyCode,
        ...filters,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      setData(result.data);
      setTotal(result.total);
      setSelectedIds([]); // Clear selection when data changes
    });
  }, [companyCode, filters, page, limit, sortBy, sortOrder, fetchData]);

  // Real-time update: Refetch when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      startTransition(async () => {
        const result = await fetchData({
          companyCode,
          ...filters,
          page,
          limit,
          sortBy,
          sortOrder,
        });
        setData(result.data);
        setTotal(result.total);
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [companyCode, filters, page, limit, sortBy, sortOrder, fetchData]);

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

  // Bulk actions
  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`${config.apiEndpoint}/${id}`, { method: "DELETE" })
        )
      );
      
      // Real-time update: Refetch immediately
      router.refresh();
      startTransition(async () => {
        const result = await fetchData({
          companyCode,
          ...filters,
          page,
          limit,
          sortBy,
          sortOrder,
        });
        setData(result.data);
        setTotal(result.total);
        setSelectedIds([]);
      });
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`${config.apiEndpoint}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      
      // Real-time update: Refetch immediately
      router.refresh();
      startTransition(async () => {
        const result = await fetchData({
          companyCode,
          ...filters,
          page,
          limit,
          sortBy,
          sortOrder,
        });
        setData(result.data);
        setTotal(result.total);
      });
    } catch (error) {
      console.error("Bulk status change failed:", error);
    }
  };

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

  // Count items per tab (for badges)
  const getTabCount = (tab: StatusTab) => {
    if (tab.key === "all") return total;
    if (tab.key === "recent") return null; // Don't show count for recent
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
                        () => toggleSelect(item.id)
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
          statuses={statusOptions}
        />
      )}
    </div>
  );
}
