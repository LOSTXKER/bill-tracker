"use client";

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

interface TransactionFiltersProps {
  type: "expense" | "income";
  contacts?: Array<{ id: string; name: string }>;
  creators?: Array<{ id: string; name: string }>;
  categories?: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
  onExport?: () => void;
  exportDisabled?: boolean;
}

export function TransactionFilters({
  type,
  contacts = [],
  creators = [],
  categories = [],
  statuses,
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
    switch (key) {
      case "status":
        return statuses.find(s => s.value === value)?.label || value;
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

  return (
    <div className="space-y-2">
      {/* Main Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            className="pl-9 h-9"
          />
          {searchValue && (
            <button
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select 
          value={filters.status || "__all__"} 
          onValueChange={(value) => updateFilter("status", value === "__all__" ? "" : value)}
        >
          <SelectTrigger className="w-[140px] h-9">
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

        {/* Category Filter (for expenses only) */}
        {type === "expense" && categories.length > 0 && (
          <Select 
            value={filters.category || "__all__"} 
            onValueChange={(value) => updateFilter("category", value === "__all__" ? "" : value)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทุกหมวดหมู่</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-3.5 w-3.5" />
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
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(({ key, value }) => (
            <Badge
              key={key}
              variant="secondary"
              className="pl-2 pr-1 py-1 flex items-center gap-1"
            >
              <span className="text-xs">{getFilterLabel(key, value)}</span>
              <button
                onClick={() => updateFilter(key, "")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            ล้างทั้งหมด
          </Button>
        </div>
      )}
    </div>
  );
}
