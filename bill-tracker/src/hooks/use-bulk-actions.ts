/**
 * Hook for handling bulk operations on transactions
 * Extracted from TransactionListClient to reduce component complexity
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revalidateSidebarBadges } from "@/lib/utils/revalidate";

export interface UseBulkActionsProps {
  apiEndpoint: string;
  companyCode: string;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}

export function useBulkActions({
  apiEndpoint,
  companyCode,
  selectedIds,
  setSelectedIds,
}: UseBulkActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleBulkDelete = async () => {
    setIsPending(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch(`${apiEndpoint}/${id}`, { method: "DELETE" })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        toast.error(`ลบสำเร็จบางส่วน (ล้มเหลว ${failed.length} รายการ)`);
      } else {
        toast.success("ลบรายการที่เลือกสำเร็จ");
      }
      setSelectedIds([]);
      revalidateSidebarBadges(companyCode);
      router.refresh();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("เกิดข้อผิดพลาดในการลบ");
    } finally {
      setIsPending(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    setIsPending(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch(`${apiEndpoint}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workflowStatus: newStatus }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        toast.error(`อัปเดตสำเร็จบางส่วน (ล้มเหลว ${failed.length} รายการ)`);
      } else {
        toast.success("เปลี่ยนสถานะสำเร็จ");
      }
      setSelectedIds([]);
      revalidateSidebarBadges(companyCode);
      router.refresh();
    } catch (error) {
      console.error("Bulk status change failed:", error);
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    } finally {
      setIsPending(false);
    }
  };

  const handleBulkInternalCompanyChange = async (companyId: string | null) => {
    setIsPending(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch(`${apiEndpoint}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ internalCompanyId: companyId }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        toast.error(`อัปเดตสำเร็จบางส่วน (ล้มเหลว ${failed.length} รายการ)`);
      } else {
        toast.success("อัปเดตบริษัทสำเร็จ");
      }
      setSelectedIds([]);
      revalidateSidebarBadges(companyCode);
      router.refresh();
    } catch (error) {
      console.error("Bulk internal company change failed:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsPending(false);
    }
  };

  const handleBulkEdit = async (fields: Record<string, unknown>) => {
    setIsPending(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch(`${apiEndpoint}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        toast.error(`แก้ไขสำเร็จบางส่วน (ล้มเหลว ${failed.length} รายการ)`);
      } else {
        toast.success("แก้ไขรายการสำเร็จ");
      }
      setSelectedIds([]);
      revalidateSidebarBadges(companyCode);
      router.refresh();
    } catch (error) {
      console.error("Bulk edit failed:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไข");
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const handleBulkApprove = async () => {
    setIsPending(true);
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
      toast.success("อนุมัติรายการที่เลือกสำเร็จ");
      setSelectedIds([]);
      revalidateSidebarBadges(companyCode);
      router.refresh();
    } catch (error) {
      console.error("Bulk approve failed:", error);
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอนุมัติ");
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    setIsPending(true);
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
      toast.success("ปฏิเสธรายการที่เลือกสำเร็จ");
      setSelectedIds([]);
      revalidateSidebarBadges(companyCode);
      router.refresh();
    } catch (error) {
      console.error("Bulk reject failed:", error);
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการปฏิเสธ");
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkInternalCompanyChange,
    handleBulkEdit,
    handleBulkApprove,
    handleBulkReject,
    isPending,
  };
}
