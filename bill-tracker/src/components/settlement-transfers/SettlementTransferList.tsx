"use client";

import { useState, useCallback } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeftRight, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { formatThaiDateTime } from "@/lib/utils/formatters";
import { fetcher } from "@/lib/utils/fetcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateRangeFilter } from "./DateRangeFilter";
import { SettlementTransferForm } from "./SettlementTransferForm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettlementTransferItem {
  id: string;
  description: string | null;
  contactName: string | null;
  amount: number;
  netPaid: number;
  billDate: string;
  notes: string | null;
  slipUrls: string[];
  workflowStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  payments: {
    id: string;
    amount: number;
    paidByType: string;
    paidByUserId: string | null;
    paidByUser: { id: string; name: string } | null;
    settlementStatus: string;
  }[];
  category: { id: string; name: string } | null;
  account: { id: string; name: string; code: string } | null;
  categoryId: string | null;
  accountId: string | null;
}

interface ApiResponse {
  success: boolean;
  data: { items: SettlementTransferItem[]; total: number };
}

interface Props {
  companyCode: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettlementTransferList({ companyCode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const sortBy = searchParams.get("sortBy") || "billDate";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  const [searchInput, setSearchInput] = useState(search);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Build SWR key
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);
  if (search) params.set("search", search);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/${companyCode}/settlement-transfers?${params.toString()}`,
    fetcher
  );

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  // URL helpers
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in updates)) next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const handleSearch = () => {
    updateParams({ search: searchInput || undefined, page: undefined });
  };

  // Columns
  const columns: ColumnDef<SettlementTransferItem>[] = [
    {
      key: "billDate",
      label: "วันที่",
      sortable: true,
      width: "120px",
      render: (item) => (
        <span className="text-sm whitespace-nowrap">
          {new Date(item.billDate).toLocaleDateString(APP_LOCALE, {
            day: "numeric",
            month: "short",
            year: "2-digit",
            timeZone: APP_TIMEZONE,
          })}
        </span>
      ),
    },
    {
      key: "contactName",
      label: "พนักงาน",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {(item.contactName || "?")[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate max-w-[180px]">
            {item.contactName || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "รายละเอียด",
      render: (item) => (
        <div className="max-w-[260px]">
          <p className="text-sm text-muted-foreground truncate">
            {item.description || "-"}
          </p>
          {item.notes && (
            <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
              {item.notes}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      label: "จำนวนเงิน",
      align: "right",
      sortable: true,
      render: (item) => (
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(item.netPaid)}
        </span>
      ),
    },
    {
      key: "slips",
      label: "สลิป",
      align: "center",
      render: (item) =>
        item.slipUrls?.length > 0 ? (
          <Badge variant="outline" className="text-xs gap-1">
            <ImageIcon className="h-3 w-3" />
            {item.slipUrls.length}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      key: "payer",
      label: "ผู้จ่ายเงิน",
      render: (item) => {
        const payer = item.payments[0];
        if (!payer) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <span className="text-sm">
            {payer.paidByType === "COMPANY"
              ? "บัญชีบริษัท"
              : payer.paidByUser?.name || "-"}
          </span>
        );
      },
    },
    {
      key: "creator",
      label: "สร้างโดย",
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.creator?.name || "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "สร้างเมื่อ",
      sortable: true,
      render: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatThaiDateTime(item.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <form
          className="flex gap-2 flex-1 w-full sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <Input
            placeholder="ค้นหาชื่อพนักงาน, รายละเอียด..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="secondary" size="sm">
            ค้นหา
          </Button>
        </form>

        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) =>
            updateParams({ dateFrom: from || undefined, dateTo: to || undefined })
          }
        />
      </div>

      {/* Table */}
      <DataTable
        data={items}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        total={total}
        headerActions={
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            สร้างรายการโอนคืน
          </Button>
        }
        emptyState={{
          icon: ArrowLeftRight,
          title: "ยังไม่มีรายการโอนเงินคืน",
          description: "รายการจะปรากฏเมื่อมีการโอนคืนเงินให้พนักงาน",
        }}
        pagination={{
          page,
          limit,
          total,
          onPageChange: (p) => updateParams({ page: String(p) }),
          onLimitChange: (l) => updateParams({ limit: String(l), page: undefined }),
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(field) => {
          const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
          updateParams({ sortBy: field, sortOrder: newOrder });
        }}
        onRowClick={(item) => router.push(`/${companyCode}/settlement-transfers/${item.id}`)}
      />

      {/* Create form sheet */}
      <SettlementTransferForm
        mode="create"
        companyCode={companyCode}
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSuccess={() => {
          mutate();
          setShowCreateForm(false);
        }}
      />
    </>
  );
}
