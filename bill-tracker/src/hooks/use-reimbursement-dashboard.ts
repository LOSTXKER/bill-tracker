import { useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import type {
  Reimbursement,
  ReimbursementSummary,
  ReimbursementTab,
  ReimbursementFilters,
  ReimbursementActionParams,
} from "@/types/reimbursement";
import { filterByTab } from "@/types/reimbursement";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ReimbursementListData {
  requests: any[];
}

interface ReimbursementSummaryData {
  summary: ReimbursementSummary;
}

interface UseReimbursementDashboardOptions {
  companyCode: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useReimbursementDashboard({
  companyCode,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseReimbursementDashboardOptions) {
  const [filters, setFilters] = useState<ReimbursementFilters>({
    tab: "all",
    search: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Fetch all reimbursements
  const requestsKey = companyCode
    ? `/api/reimbursement-requests?company=${companyCode}`
    : null;

  const {
    data: requestsData,
    error: requestsError,
    isLoading: requestsLoading,
  } = useSWR<ApiResponse<ReimbursementListData>>(requestsKey, {
    revalidateOnFocus: true,
    refreshInterval: autoRefresh ? refreshInterval : 0,
  });

  // Fetch summary
  const summaryKey = companyCode
    ? `/api/reimbursement-requests/summary?company=${companyCode}`
    : null;

  const {
    data: summaryData,
    error: summaryError,
    isLoading: summaryLoading,
  } = useSWR<ApiResponse<ReimbursementSummaryData>>(summaryKey, {
    revalidateOnFocus: true,
    refreshInterval: autoRefresh ? refreshInterval : 0,
  });

  // Map raw data to typed reimbursements
  const allReimbursements = useMemo<Reimbursement[]>(() => {
    if (!requestsData?.success || !requestsData.data?.requests) return [];

    return requestsData.data.requests.map((req: any) => ({
      id: req.id,
      description: req.description,
      amount: req.amount,
      vatRate: req.vatRate,
      vatAmount: req.vatAmount,
      netAmount: req.netAmount,
      billDate: req.billDate,
      paymentMethod: req.paymentMethod,
      invoiceNumber: req.invoiceNumber,
      status: req.status,
      fraudScore: req.fraudScore,
      fraudFlags: req.fraudFlags || [],
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      requester: req.requesterName
        ? {
            id: null,
            name: req.requesterName,
            email: req.requesterEmail || null,
            avatarUrl: null,
          }
        : null,
      bankInfo: req.bankName
        ? {
            bankName: req.bankName,
            bankAccountNo: req.bankAccountNo,
            bankAccountName: req.bankAccountName,
          }
        : undefined,
      trackingCode: req.trackingCode,
      account: req.account,
      contact: req.contact,
      rejectedReason: req.rejectedReason,
      rejectedAt: req.rejectedAt,
      rejectedBy: req.rejecter,
      approvedAt: req.approvedAt,
      approvedBy: req.approver,
      paidAt: req.paidAt,
      paidBy: req.payer,
      paymentRef: req.paymentRef,
      receiptUrls: req.receiptUrls || [],
      linkedExpense: req.linkedExpense || null,
    }));
  }, [requestsData]);

  // Filter and search reimbursements
  const filteredReimbursements = useMemo(() => {
    let results = filterByTab(allReimbursements, filters.tab);

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.description?.toLowerCase().includes(searchLower) ||
          r.requester?.name.toLowerCase().includes(searchLower) ||
          r.account?.name.toLowerCase().includes(searchLower) ||
          r.trackingCode?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filters
    if (filters.dateFrom) {
      results = results.filter((r) => r.billDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      results = results.filter((r) => r.billDate <= filters.dateTo!);
    }

    // Apply amount filters
    if (filters.minAmount !== undefined) {
      results = results.filter((r) => r.netAmount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      results = results.filter((r) => r.netAmount <= filters.maxAmount!);
    }

    // Apply account filter
    if (filters.accountId) {
      results = results.filter((r) => r.account?.id === filters.accountId);
    }

    // Sort by date descending (newest first)
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allReimbursements, filters]);

  const summary = summaryData?.data?.summary || null;

  // Refetch data
  const refetch = useCallback(async () => {
    await Promise.all([mutate(requestsKey), mutate(summaryKey)]);
  }, [requestsKey, summaryKey]);

  // Actions with optimistic toast feedback
  const approve = useCallback(
    async (id: string) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      const toastId = toast.loading("กำลังอนุมัติ...");
      
      try {
        const response = await fetch(`/api/reimbursement-requests/${id}/approve`, {
          method: "POST",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }

        toast.success("อนุมัติเบิกจ่ายแล้ว", { id: toastId });
        await refetch();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
        return false;
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refetch]
  );

  const reject = useCallback(
    async ({ id, reason }: ReimbursementActionParams) => {
      if (!reason) {
        toast.error("กรุณาระบุเหตุผล");
        return false;
      }

      setProcessingIds((prev) => new Set(prev).add(id));
      const toastId = toast.loading("กำลังปฏิเสธ...");
      
      try {
        const response = await fetch(`/api/reimbursement-requests/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }

        toast.success("ปฏิเสธเบิกจ่ายแล้ว", { id: toastId });
        await refetch();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
        return false;
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refetch]
  );

  const pay = useCallback(
    async ({ id, paymentRef, paymentMethod }: ReimbursementActionParams) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      const toastId = toast.loading("กำลังบันทึกการจ่ายเงิน...");
      
      try {
        const response = await fetch(`/api/reimbursement-requests/${id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentRef,
            paymentMethod: paymentMethod || "BANK_TRANSFER",
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }

        toast.success("จ่ายเงินสำเร็จ", { id: toastId });
        await refetch();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
        return false;
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refetch]
  );

  // Delete action with optimistic toast feedback
  const deleteRequest = useCallback(
    async (id: string) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      const toastId = toast.loading("กำลังลบ...");
      
      try {
        const response = await fetch(`/api/reimbursement-requests/${id}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }

        toast.success("ลบรายการเบิกจ่ายแล้ว", { id: toastId });
        await refetch();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
        return false;
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refetch]
  );

  // Batch actions with optimistic toast feedback
  const batchPay = useCallback(
    async (ids: string[], paymentRef?: string, paymentMethod?: string) => {
      if (ids.length === 0) {
        toast.error("กรุณาเลือกรายการที่ต้องการจ่าย");
        return false;
      }

      ids.forEach((id) => setProcessingIds((prev) => new Set(prev).add(id)));
      const toastId = toast.loading(`กำลังจ่ายเงิน ${ids.length} รายการ...`);

      try {
        const promises = ids.map((id) =>
          fetch(`/api/reimbursement-requests/${id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentRef,
              paymentMethod: paymentMethod || "BANK_TRANSFER",
            }),
          })
        );

        const results = await Promise.allSettled(promises);
        const successCount = results.filter((r) => r.status === "fulfilled").length;
        const failCount = results.filter((r) => r.status === "rejected").length;

        if (successCount > 0 && failCount === 0) {
          toast.success(`จ่ายเงินสำเร็จ ${successCount} รายการ`, { id: toastId });
        } else if (successCount > 0 && failCount > 0) {
          toast.warning(`จ่ายเงินสำเร็จ ${successCount} รายการ, ไม่สำเร็จ ${failCount} รายการ`, { id: toastId });
        } else {
          toast.error(`จ่ายเงินไม่สำเร็จ ${failCount} รายการ`, { id: toastId });
        }

        await refetch();
        setSelectedItems(new Set());
        return successCount > 0;
      } catch (error) {
        toast.error("เกิดข้อผิดพลาด", { id: toastId });
        return false;
      } finally {
        ids.forEach((id) =>
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        );
      }
    },
    [refetch]
  );

  // Selection helpers
  const toggleSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredReimbursements.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredReimbursements.map((r) => r.id)));
    }
  }, [selectedItems.size, filteredReimbursements]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Get selected total
  const selectedTotal = useMemo(() => {
    return filteredReimbursements
      .filter((r) => selectedItems.has(r.id))
      .reduce((sum, r) => sum + r.netAmount, 0);
  }, [filteredReimbursements, selectedItems]);

  return {
    // Data
    reimbursements: filteredReimbursements,
    allReimbursements,
    summary,
    isLoading: requestsLoading || summaryLoading,
    error: requestsError || summaryError,

    // Filters
    filters,
    setFilters,
    setTab: (tab: ReimbursementTab) => setFilters((prev) => ({ ...prev, tab })),
    setSearch: (search: string) => setFilters((prev) => ({ ...prev, search })),

    // Selection
    selectedId,
    setSelectedId,
    selectedItems,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    selectedTotal,

    // Processing state
    processingIds,
    isProcessing: (id: string) => processingIds.has(id),

    // Actions
    approve,
    reject,
    pay,
    deleteRequest,
    batchPay,
    refetch,
  };
}
