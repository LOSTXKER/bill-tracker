/**
 * Hook for handling bulk operations on transactions
 * Extracted from TransactionListClient to reduce component complexity
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface UseBulkActionsProps {
  apiEndpoint: string;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}

export function useBulkActions({
  apiEndpoint,
  selectedIds,
  setSelectedIds,
}: UseBulkActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBulkDelete = async () => {
    startTransition(async () => {
      try {
        await Promise.all(
          selectedIds.map(id =>
            fetch(`${apiEndpoint}/${id}`, { method: "DELETE" })
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
            fetch(`${apiEndpoint}/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
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
            fetch(`${apiEndpoint}/${id}`, {
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
        const res = await fetch(`${apiEndpoint}/batch/approve`, {
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
        const res = await fetch(`${apiEndpoint}/batch/reject`, {
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

  return {
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkInternalCompanyChange,
    handleBulkApprove,
    handleBulkReject,
    isPending,
  };
}
