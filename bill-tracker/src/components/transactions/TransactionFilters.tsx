"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, Calendar } from "lucide-react";
import { useTransactionFilters } from "@/hooks/use-transaction-filters";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { 
  EXPENSE_STATUS_LABELS, 
  INCOME_STATUS_LABELS,
  EXPENSE_WORKFLOW_INFO,
  INCOME_WORKFLOW_INFO 
} from "@/lib/constants/transaction";

interface TransactionFiltersProps {
  type: "expense" | "income";
  contacts?: Array<{ id: string; name: string }>;
  creators?: Array<{ id: string; name: string }>;
  categories?: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
  hideStatusFilter?: boolean; // Hide status dropdown when using tabs
  hideStatusBadges?: boolean; // Hide status badges when using tabs (status is shown in tabs)
  onExport?: () => void;
  exportDisabled?: boolean;
}

export function TransactionFilters({
  type,
  contacts = [],
  creators = [],
  categories = [],
  statuses,
  hideStatusFilter = false,
  hideStatusBadges = false,
}: TransactionFiltersProps) {
  const {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    activeFilters,
  } = useTransactionFilters();

  const [searchValue, setSearchValue] = useState(filters.search);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
  });

  const handleSearchSubmit = () => {
    updateFilter("search", searchValue);
  };

  const handleSearchClear = () => {
    setSearchValue("");
    updateFilter("search", "");
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    updateFilters({
      dateFrom: range?.from ? range.from.toISOString().split("T")[0] : "",
      dateTo: range?.to ? range.to.toISOString().split("T")[0] : "",
    });
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    updateFilters({ dateFrom: "", dateTo: "" });
  };

  const getFilterLabel = (key: string, value: string) => {
    const statusLabels = type === "expense" ? EXPENSE_STATUS_LABELS : INCOME_STATUS_LABELS;
    
    switch (key) {
      case "status":
        // Handle multiple statuses (comma-separated)
        if (value.includes(",")) {
          const statusList = value.split(",");
          const labels = statusList.map(s => statusLabels[s]?.label || s);
          return labels.join(", ");
        }
        return statusLabels[value]?.label || statuses.find(s => s.value === value)?.label || value;
      case "category":
        return categories.find(c => c.value === value)?.label || value;
      case "contact":
        return contacts.find(c => c.id === value)?.name || value;
      case "creator":
        return creators.find(c => c.id === value)?.name || value;
      case "dateFrom":
        return `จาก: ${format(new Date(value), "d MMM yyyy", { locale: th })}`;
      case "dateTo":
        return `ถึง: ${format(new Date(value), "d MMM yyyy", { locale: th })}`;
      case "search":
        return `ค้นหา: "${value}"`;
      default:
        return value;
    }
  };

  // Date range presets
  const setDatePreset = (preset: "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    let from: Date;
    let to: Date;
    
    switch (preset) {
      case "thisMonth":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "thisYear":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
    }
    
    setDateRange({ from, to });
    updateFilters({
      dateFrom: from.toISOString().split("T")[0],
      dateTo: to.toISOString().split("T")[0],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหา..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          className="pl-9 h-8 text-sm"
        />
        {searchValue && (
          <button
            onClick={handleSearchClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-sm font-normal",
              dateRange?.from ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            {dateRange?.from ? (
              dateRange.to ? (
                <span>
                  {format(dateRange.from, "d MMM", { locale: th })} - {format(dateRange.to, "d MMM yy", { locale: th })}
                </span>
              ) : (
                <span>{format(dateRange.from, "d MMM yy", { locale: th })}</span>
              )
            ) : (
              "ช่วงวันที่"
            )}
            {(dateRange?.from || dateRange?.to) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearDateRange();
                }}
                className="ml-1.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {/* Date Presets */}
          <div className="flex gap-1 p-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDatePreset("thisMonth")}
            >
              เดือนนี้
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDatePreset("lastMonth")}
            >
              เดือนที่แล้ว
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDatePreset("thisYear")}
            >
              ปีนี้
            </Button>
          </div>
          <CalendarComponent
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={1}
            initialFocus
          />
          {(dateRange?.from || dateRange?.to) && (
            <div className="border-t p-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearDateRange}>
                ล้างวันที่
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Status Filter - hidden when using tabs */}
      {!hideStatusFilter && (
        <>
          <div className="h-6 w-px bg-border" />
          <Select 
            value={filters.status || "__all__"} 
            onValueChange={(value) => updateFilter("status", value === "__all__" ? "" : value)}
          >
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทุกสถานะ</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Category Filter (for expenses only) */}
      {type === "expense" && categories.length > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <Select 
            value={filters.category || "__all__"} 
            onValueChange={(value) => updateFilter("category", value === "__all__" ? "" : value)}
          >
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="บัญชี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทุกบัญชี</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Active Filter Badges - inline with filters */}
      {(() => {
        const displayFilters = hideStatusBadges 
          ? activeFilters.filter(f => f.key !== "status")
          : activeFilters;
        
        if (displayFilters.length === 0) return null;
        
        return (
          <>
            <div className="h-6 w-px bg-border" />
            {displayFilters.map(({ key, value }) => {
              // For status filter, render individual colored badges
              if (key === "status") {
                const workflowInfo = type === "expense" ? EXPENSE_WORKFLOW_INFO : INCOME_WORKFLOW_INFO;
                const statusList = value.includes(",") ? value.split(",") : [value];
                
                const removeStatus = (statusToRemove: string) => {
                  const remaining = statusList.filter((s: string) => s !== statusToRemove);
                  updateFilter("status", remaining.join(","));
                };
                
                return (
                  <React.Fragment key={key}>
                    {statusList.map((status: string) => {
                      const info = workflowInfo[status];
                      return (
                        <Badge
                          key={status}
                          variant="outline"
                          className={cn(
                            "h-6 pl-2 pr-1 flex items-center gap-0.5 cursor-default text-xs",
                            info?.bgColor,
                            info?.color
                          )}
                        >
                          {info?.label || status}
                          <button
                            onClick={() => removeStatus(status)}
                            className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </React.Fragment>
                );
              }
              
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="h-6 pl-2 pr-1 flex items-center gap-0.5 text-xs"
                >
                  {getFilterLabel(key, value)}
                  <button
                    onClick={() => updateFilter(key, "")}
                    className="hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              );
            })}
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              ล้าง
            </button>
          </>
        );
      })()}
    </div>
  );
}
