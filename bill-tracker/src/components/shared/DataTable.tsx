"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
}

export interface DataTableEmptyState {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyField?: keyof T;
  title?: string;
  total?: number;
  isLoading?: boolean;
  headerActions?: ReactNode;
  emptyState?: DataTableEmptyState;
  // Pagination
  pagination?: DataTablePagination;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string> | string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (item: T) => string;
  isRowSelectable?: (item: T) => boolean;
  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
  // Row
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  /** Return an href to enable right-click "Open in new tab" for the row */
  getRowHref?: (item: T) => string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface SortableHeaderProps {
  field: string;
  children: ReactNode;
  align?: "left" | "center" | "right";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
}

function SortableHeader({
  field,
  children,
  align = "left",
  sortBy,
  sortOrder,
  onSort,
}: SortableHeaderProps) {
  const isActive = sortBy === field;

  return (
    <TableHead
      className={cn(
        "text-muted-foreground font-medium",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
    >
      <button
        onClick={() => onSort?.(field)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          isActive && "text-foreground",
          align === "right" && "ml-auto"
        )}
      >
        {children}
        {isActive ? (
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
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTable<T>({
  data,
  columns,
  keyField,
  title,
  total,
  isLoading,
  headerActions,
  emptyState,
  pagination,
  selectable,
  selectedIds,
  onSelectionChange,
  getRowId,
  isRowSelectable,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  rowClassName,
  getRowHref,
}: DataTableProps<T>) {
  // Convert selectedIds to Set for efficient lookup
  const selectedSet =
    selectedIds instanceof Set
      ? selectedIds
      : new Set(selectedIds || []);

  // Get row ID helper
  const getIdForRow = (item: T, index: number): string => {
    if (getRowId) return getRowId(item);
    if (keyField) return String(item[keyField]);
    return String(index);
  };

  // Selection handlers
  const selectableItems = selectable
    ? data.filter((item) => !isRowSelectable || isRowSelectable(item))
    : [];

  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item, index) =>
      selectedSet.has(getIdForRow(item, index))
    );

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;

    if (allSelected) {
      onSelectionChange([]);
    } else {
      const ids = selectableItems.map((item, index) =>
        getIdForRow(item, index)
      );
      onSelectionChange(ids);
    }
  };

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;

    const newSelected = selectedSet.has(id)
      ? Array.from(selectedSet).filter((i) => i !== id)
      : [...Array.from(selectedSet), id];
    onSelectionChange(newSelected);
  };

  // Display total
  const displayTotal = total ?? data.length;

  // Empty state icon
  const EmptyIcon = emptyState?.icon;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            {title && (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            )}
            <span className="text-xs text-muted-foreground">
              ({displayTotal} รายการ)
            </span>
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          {headerActions}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {data.length === 0 && !isLoading ? (
          // Empty State
          <div className="text-center py-12">
            {EmptyIcon && (
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <EmptyIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-2">
              {emptyState?.title || "ไม่มีข้อมูล"}
            </p>
            {emptyState?.description && (
              <p className="text-xs text-muted-foreground mb-4">
                {emptyState.description}
              </p>
            )}
            {emptyState?.action}
          </div>
        ) : isLoading && data.length === 0 ? (
          // Loading Skeleton
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent group">
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="เลือกทั้งหมด"
                    />
                  </TableHead>
                )}
                {columns.map((column) =>
                  column.sortable && onSort ? (
                    <SortableHeader
                      key={column.key}
                      field={column.key}
                      align={column.align}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    >
                      {column.label}
                    </SortableHeader>
                  ) : (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "text-muted-foreground font-medium",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.width && `w-[${column.width}]`,
                        column.className
                      )}
                    >
                      {column.label}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const rowId = getIdForRow(item, index);
                const isSelected = selectedSet.has(rowId);
                const canSelect = !isRowSelectable || isRowSelectable(item);
                const customClassName = rowClassName?.(item) || "";

                const rowHref = getRowHref?.(item);

                return (
                  <TableRow
                    key={rowId}
                    className={cn(
                      "transition-colors",
                      (onRowClick || rowHref) && "relative cursor-pointer",
                      isSelected && "bg-primary/5",
                      customClassName
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <TableCell className="relative z-10" onClick={(e) => e.stopPropagation()}>
                        {canSelect && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(rowId)}
                          />
                        )}
                      </TableCell>
                    )}
                    {columns.map((column, colIndex) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          /* First content column holds the invisible overlay link */
                          !selectable && colIndex === 0 && rowHref && "relative",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right",
                          column.className
                        )}
                      >
                        {/* Overlay link on the first column — stretches across full row via tr position:relative */}
                        {!selectable && colIndex === 0 && rowHref && (
                          <Link href={rowHref} className="absolute inset-0" tabIndex={-1} aria-hidden />
                        )}
                        {column.render
                          ? column.render(item, index)
                          : String((item as Record<string, unknown>)[column.key] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {pagination && data.length > 0 && (
        <DataTablePagination {...pagination} />
      )}
    </div>
  );
}

// ============================================================================
// Pagination Component
// ============================================================================

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTablePaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

function DataTablePagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>แสดง</span>
        <Select
          value={limit.toString()}
          onValueChange={(value) => onLimitChange(parseInt(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span>รายการ (ทั้งหมด {total} รายการ)</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          {startItem}-{endItem} จาก {total}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            ก่อนหน้า
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm">
              หน้า {page} / {totalPages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
          >
            ถัดไป
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Re-export pagination for standalone use
export { DataTablePagination };
export type { DataTablePaginationProps };
