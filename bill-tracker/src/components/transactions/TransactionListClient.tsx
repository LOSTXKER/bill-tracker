"use client";

import { useEffect, useState, useTransition, ReactNode } from "react";
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
import { Pagination } from "@/components/transactions/Pagination";
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

export function TransactionListClient({
  companyCode,
  initialData,
  initialTotal,
  config,
  fetchData,
}: TransactionListClientProps) {
  const router = useRouter();
  const { filters } = useTransactionFilters();
  const { page, limit, setPage, setLimit } = usePagination();
  const { sortBy, sortOrder, toggleSort } = useSorting();
  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch data when filters change
  useEffect(() => {
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TransactionFilters
        type={config.type}
        statuses={statusOptions}
      />

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">{config.title}</h3>
          <div className="flex items-center gap-2">
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <ExportButton
              data={data}
              filename={`${config.type}s-${new Date().toISOString().split("T")[0]}`}
              type={config.type}
            />
          </div>
        </div>
        <div className="p-0">
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
