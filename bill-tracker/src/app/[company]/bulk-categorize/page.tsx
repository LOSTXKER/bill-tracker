"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CategorySelector } from "@/components/forms/shared/CategorySelector";
import { Pagination } from "@/components/shared/Pagination";
import {
  ArrowLeft,
  Calendar,
  Check,
  CircleAlert,
  Loader2,
  Search,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface CategoryInfo {
  id: string;
  name: string;
  Parent?: { id: string; name: string } | null;
}

interface TransactionItem {
  id: string;
  description: string | null;
  source?: string | null;
  contactName: string | null;
  contactId: string | null;
  billDate?: string;
  receiveDate?: string;
  amount: number;
  netPaid?: number;
  netReceived?: number;
  Category: CategoryInfo | null;
  Contact?: { id: string; name: string } | null;
}

interface CategoryChild {
  id: string;
  name: string;
  _count?: { Expenses: number; Incomes: number };
}

interface CategoryGroup {
  id: string;
  name: string;
  _count?: { Expenses: number; Incomes: number };
  Children: CategoryChild[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type TransactionType = "expense" | "income";

const DATE_PRESETS = [
  { label: "เดือนนี้", key: "thisMonth" },
  { label: "เดือนที่แล้ว", key: "lastMonth" },
  { label: "ปีนี้", key: "thisYear" },
] as const;

function getDatePreset(key: string) {
  const now = new Date();
  switch (key) {
    case "thisMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case "thisYear":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31),
      };
    default:
      return undefined;
  }
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDisplayLabel(item: TransactionItem) {
  return item.description || item.source || "-";
}

function getDate(item: TransactionItem) {
  return item.billDate || item.receiveDate || "";
}

function getNetAmount(item: TransactionItem) {
  return item.netPaid ?? item.netReceived ?? item.amount;
}

// --------------- Inline Category Cell ---------------

function InlineCategoryCell({
  item,
  companyCode,
  type,
  onUpdated,
}: {
  item: TransactionItem;
  companyCode: string;
  type: TransactionType;
  onUpdated: (id: string, category: CategoryInfo | null) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (categoryId: string | null) => {
    if (categoryId === item.Category?.id) return;
    setSaving(true);
    try {
      const endpoint =
        type === "expense"
          ? `/api/expenses/${item.id}`
          : `/api/incomes/${item.id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, companyCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาด");
      }
      const updated = json.data?.[type] || json.data;
      const newCategory = updated?.Category || null;
      onUpdated(item.id, newCategory);
      toast.success("อัปเดตหมวดหมู่สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>กำลังบันทึก...</span>
      </div>
    );
  }

  return (
    <CategorySelector
      value={item.Category?.id || null}
      onValueChange={handleChange}
      companyCode={companyCode}
      type={type === "expense" ? "EXPENSE" : "INCOME"}
      placeholder="เลือกหมวดหมู่..."
      className={cn(
        "h-9 text-xs",
        !item.Category && "border-dashed border-orange-400/60 text-muted-foreground"
      )}
    />
  );
}

// --------------- Main Page ---------------

export default function BulkCategorizePage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string) || "";

  const [type, setType] = useState<TransactionType>("expense");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchText, setSearchText] = useState("");
  const [searchCommitted, setSearchCommitted] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [filterContact, setFilterContact] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Categories for filter dropdown
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);

  // Contacts for filter dropdown
  const [contacts, setContacts] = useState<{ id: string; name: string; _count?: { Expenses: number; Incomes: number } }[]>([]);

  // Bulk actions
  const [bulkCategoryId, setBulkCategoryId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // Fetch categories for the filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const catType = type === "expense" ? "EXPENSE" : "INCOME";
      const res = await fetch(
        `/api/${companyCode}/categories?type=${catType}&activeOnly=false`
      );
      if (res.ok) {
        const json = await res.json();
        setCategoryGroups(json?.data?.categories || []);
      }
    } catch {
      // ignore
    }
  }, [companyCode, type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch contacts for the filter dropdown
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/contacts?company=${companyCode.toUpperCase()}&limit=10000`
      );
      if (res.ok) {
        const json = await res.json();
        setContacts(
          (json?.data?.contacts || []).map(
            (c: { id: string; name: string; _count?: { Expense: number; Income: number } }) => ({
              id: c.id,
              name: c.name,
              _count: c._count
                ? { Expenses: c._count.Expense, Incomes: c._count.Income }
                : undefined,
            })
          )
        );
      }
    } catch {
      // ignore
    }
  }, [companyCode]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const allCategoryOptions = useMemo(() => {
    const countKey = type === "expense" ? "Expenses" : "Incomes";
    const options: { value: string; label: string; count: number }[] = [];
    for (const group of categoryGroups) {
      for (const child of group.Children || []) {
        const count = child._count?.[countKey] ?? 0;
        options.push({
          value: child.id,
          label: `[${group.name}] ${child.name}`,
          count,
        });
      }
    }
    return options;
  }, [categoryGroups, type]);

  const totalCategoryCount = useMemo(
    () => allCategoryOptions.reduce((sum, o) => sum + o.count, 0),
    [allCategoryOptions]
  );

  const contactOptions = useMemo(() => {
    const countKey = type === "expense" ? "Expenses" : "Incomes";
    return contacts
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count?.[countKey] ?? 0,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [contacts, type]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const apiPath = type === "expense" ? "/api/expenses" : "/api/incomes";
      const params = new URLSearchParams();
      params.set("company", companyCode);
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      params.set("sortBy", type === "expense" ? "billDate" : "receiveDate");
      params.set("sortOrder", "desc");

      if (searchCommitted) params.set("search", searchCommitted);
      if (filterContact) params.set("contact", filterContact);
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (dateRange?.from) params.set("dateFrom", formatDateLocal(dateRange.from));
      if (dateRange?.to) params.set("dateTo", formatDateLocal(dateRange.to));

      const res = await fetch(`${apiPath}?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const key = type === "expense" ? "expenses" : "incomes";
        setItems(json.data?.[key] || []);
        setPagination((prev) => ({
          ...prev,
          total: json.data?.pagination?.total || 0,
          totalPages: json.data?.pagination?.totalPages || 0,
        }));
      }
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [type, pagination.page, pagination.limit, searchCommitted, filterContact, filterCategoryId, dateRange, companyCode]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset on type change
  useEffect(() => {
    setSelectedIds(new Set());
    setBulkCategoryId(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [type]);

  // Inline update handler -- patch local state without refetching
  const handleInlineUpdate = useCallback(
    (id: string, category: CategoryInfo | null) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, Category: category } : item))
      );
    },
    []
  );

  // Summary stats
  const uncategorizedCount = useMemo(
    () => items.filter((item) => !item.Category).length,
    [items]
  );

  const selectAllUncategorized = () => {
    const uncatIds = items.filter((i) => !i.Category).map((i) => i.id);
    setSelectedIds(new Set(uncatIds));
  };

  // Selection
  const allOnPageSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.add(item.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Bulk apply
  const applyBulkCategory = async () => {
    if (!bulkCategoryId || selectedIds.size === 0) return;
    setApplying(true);
    try {
      const ids = Array.from(selectedIds);
      if (type === "expense") {
        const res = await fetch(
          `/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expenseIds: ids, categoryId: bulkCategoryId }),
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "เกิดข้อผิดพลาด");
        toast.success(`จัดหมวด ${json.data.updated} รายการสำเร็จ`);
      } else {
        const res = await fetch(
          `/api/${companyCode.toLowerCase()}/incomes/bulk-categorize`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ incomeIds: ids, categoryId: bulkCategoryId }),
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "เกิดข้อผิดพลาด");
        toast.success(`จัดหมวด ${json.data.updated} รายการสำเร็จ`);
      }
      setSelectedIds(new Set());
      setBulkCategoryId(null);
      fetchTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApplying(false);
    }
  };

  // AI suggest
  const aiSuggestForSelected = async () => {
    if (selectedIds.size === 0) return;
    const selected = items.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;

    const descriptions = [
      ...new Set(
        selected
          .map((item) =>
            [getDisplayLabel(item), item.contactName].filter(Boolean).join(" - ")
          )
          .filter(Boolean)
      ),
    ].slice(0, 15);

    if (descriptions.length === 0) {
      toast.error("ไม่มีรายละเอียดสำหรับวิเคราะห์");
      return;
    }

    setAiSuggesting(true);
    try {
      const catType = type === "expense" ? "expense" : "income";
      const res = await fetch(
        `/api/${companyCode.toLowerCase()}/ai/suggest-category`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptions, type: catType }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "AI วิเคราะห์ไม่สำเร็จ");

      const cat = json.data as {
        categoryId: string | null;
        categoryName: string;
        groupName: string;
        isNew: boolean;
        confidence: number;
        suggestNewName?: string;
        suggestNewParent?: string;
        reason?: string;
      };

      if (!cat.categoryId) {
        const suggestLabel = cat.suggestNewName
          ? `แนะนำสร้างหมวดใหม่: "${cat.suggestNewName}" ในกลุ่ม "${cat.suggestNewParent || cat.groupName}"`
          : "ไม่พบหมวดที่เหมาะสม กรุณาสร้างหมวดใหม่";
        toast.info(suggestLabel, { duration: 6000 });
      } else {
        setBulkCategoryId(cat.categoryId);
        toast.success(`AI แนะนำ: [${cat.groupName}] ${cat.categoryName}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สามารถวิเคราะห์ได้");
    } finally {
      setAiSuggesting(false);
    }
  };

  // Filter helpers
  const clearDateRange = () => {
    setDateRange(undefined);
  };

  const handleDatePreset = (key: string) => {
    const preset = getDatePreset(key);
    if (preset) setDateRange(preset);
  };

  const resetFilters = () => {
    setSearchText("");
    setSearchCommitted("");
    setFilterCategoryId("");
    setFilterContact("");
    setDateRange(undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    !!searchCommitted || !!filterCategoryId || !!filterContact || !!dateRange?.from;

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, page: 1, limit: newLimit }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">จัดการหมวดหมู่รายการ</h1>
          <p className="text-sm text-muted-foreground">
            คลิกที่หมวดหมู่ในแต่ละแถวเพื่อแก้ไขทันที หรือเลือกหลายรายการเพื่อจัดหมวดพร้อมกัน
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
        <TabsList>
          <TabsTrigger value="expense">ค่าใช้จ่าย</TabsTrigger>
          <TabsTrigger value="income">รายรับ</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="ค้นหาคำอธิบาย..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchCommitted(searchText);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }
                }}
                className="h-8 pl-8 text-sm"
              />
              {searchText && (
                <button
                  onClick={() => {
                    setSearchText("");
                    setSearchCommitted("");
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Category filter */}
            <Select
              value={filterCategoryId || "__all__"}
              onValueChange={(v) => {
                setFilterCategoryId(v === "__all__" ? "" : v);
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSelectedIds(new Set());
              }}
            >
              <SelectTrigger className="w-[220px] h-8 text-sm">
                <SelectValue placeholder="หมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">ทุกหมวดหมู่ ({totalCategoryCount})</SelectItem>
                <SelectItem value="__uncategorized__">ไม่มีหมวดหมู่</SelectItem>
                {allCategoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} ({opt.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border" />

            {/* Contact filter */}
            <Select
              value={filterContact || "__all__"}
              onValueChange={(v) => {
                setFilterContact(v === "__all__" ? "" : v);
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSelectedIds(new Set());
              }}
            >
              <SelectTrigger className="w-[220px] h-8 text-sm">
                <SelectValue placeholder="ผู้ติดต่อ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">ทุกผู้ติดต่อ</SelectItem>
                {contactOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border" />

            {/* Date range */}
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
                        {format(dateRange.from, "d MMM", { locale: th })} -{" "}
                        {format(dateRange.to, "d MMM yy", { locale: th })}
                      </span>
                    ) : (
                      <span>
                        {format(dateRange.from, "d MMM yy", { locale: th })}
                      </span>
                    )
                  ) : (
                    "ช่วงวันที่"
                  )}
                  {dateRange?.from && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        clearDateRange();
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          clearDateRange();
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }
                      }}
                      className="ml-1.5 hover:bg-muted rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex gap-1 p-2 border-b bg-muted/30">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        handleDatePreset(preset.key);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  numberOfMonths={1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <>
                <div className="h-6 w-px bg-border" />
                {searchCommitted && (
                  <Badge
                    variant="secondary"
                    className="h-6 pl-2 pr-1 flex items-center gap-0.5 text-xs"
                  >
                    ค้นหา: &quot;{searchCommitted}&quot;
                    <button
                      onClick={() => {
                        setSearchText("");
                        setSearchCommitted("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                {filterCategoryId && (
                  <Badge
                    variant="secondary"
                    className="h-6 pl-2 pr-1 flex items-center gap-0.5 text-xs"
                  >
                    {filterCategoryId === "__uncategorized__"
                      ? "ไม่มีหมวดหมู่"
                      : allCategoryOptions.find((o) => o.value === filterCategoryId)
                          ?.label || filterCategoryId}
                    <button
                      onClick={() => {
                        setFilterCategoryId("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                {filterContact && (
                  <Badge
                    variant="secondary"
                    className="h-6 pl-2 pr-1 flex items-center gap-0.5 text-xs"
                  >
                    {contacts.find((c) => c.id === filterContact)?.name || filterContact}
                    <button
                      onClick={() => {
                        setFilterContact("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  ล้างทั้งหมด
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats bar */}
      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3 text-sm px-1">
          <span className="text-muted-foreground">
            แสดง {items.length} จาก {pagination.total} รายการ
          </span>
          {uncategorizedCount > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="flex items-center gap-1.5 text-orange-500">
                <CircleAlert className="h-3.5 w-3.5" />
                {uncategorizedCount} ไม่มีหมวดหมู่
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-orange-500 hover:text-orange-600"
                onClick={selectAllUncategorized}
              >
                เลือกทั้งหมดที่ไม่มีหมวด
              </Button>
            </>
          )}
          {uncategorizedCount === 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="flex items-center gap-1.5 text-green-500">
                <Check className="h-3.5 w-3.5" />
                ทุกรายการมีหมวดหมู่แล้ว
              </span>
            </>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5 sticky top-0 z-10">
          <CardContent className="flex items-center gap-3 p-3">
            <Badge variant="secondary" className="shrink-0">
              {selectedIds.size} รายการ
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 shrink-0"
              onClick={aiSuggestForSelected}
              disabled={aiSuggesting}
            >
              {aiSuggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI วิเคราะห์
            </Button>
            <div className="flex-1 max-w-sm">
              <CategorySelector
                value={bulkCategoryId}
                onValueChange={setBulkCategoryId}
                companyCode={companyCode}
                type={type === "expense" ? "EXPENSE" : "INCOME"}
                placeholder="เลือกหมวดหมู่สำหรับรายการที่เลือก..."
              />
            </div>
            <Button
              onClick={applyBulkCategory}
              disabled={!bulkCategoryId || applying}
              size="sm"
              className="shrink-0"
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Tags className="h-4 w-4 mr-1" />
              )}
              จัดหมวด
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setSelectedIds(new Set());
                setBulkCategoryId(null);
              }}
            >
              ยกเลิก
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected && items.length > 0}
                    onCheckedChange={toggleSelectAll}
                    disabled={items.length === 0}
                  />
                </TableHead>
                <TableHead>
                  {type === "expense" ? "คำอธิบาย" : "แหล่งรายรับ"}
                </TableHead>
                <TableHead className="w-[140px]">ผู้ติดต่อ</TableHead>
                <TableHead className="w-[90px]">วันที่</TableHead>
                <TableHead className="w-[110px] text-right">จำนวนเงิน</TableHead>
                <TableHead className="w-[260px]">หมวดหมู่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-64 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {hasActiveFilters ? (
                        <>
                          <Search className="h-8 w-8 opacity-50" />
                          <p>ไม่พบรายการที่ตรงกับตัวกรอง</p>
                          <Button variant="link" size="sm" onClick={resetFilters}>
                            ล้างตัวกรอง
                          </Button>
                        </>
                      ) : (
                        <>
                          <Check className="h-8 w-8 text-green-500" />
                          <p>ไม่มีรายการ</p>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const dateStr = getDate(item);
                  const isUncategorized = !item.Category;

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        isUncategorized && "border-l-2 border-l-orange-400",
                        selectedIds.has(item.id) && "bg-primary/5"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate block max-w-[280px]">
                          {getDisplayLabel(item)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate">
                        {item.Contact?.name || item.contactName || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {dateStr
                          ? new Date(dateStr).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {formatCurrency(getNetAmount(item))}
                      </TableCell>
                      <TableCell>
                        <InlineCategoryCell
                          item={item}
                          companyCode={companyCode}
                          type={type}
                          onUpdated={handleInlineUpdate}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && pagination.total > 0 && (
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </Card>
    </div>
  );
}
