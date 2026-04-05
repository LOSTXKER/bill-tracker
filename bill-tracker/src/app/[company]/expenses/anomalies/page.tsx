"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CategorySelector } from "@/components/forms/shared/CategorySelector";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  SearchCheck,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface AnomalyCategory {
  id: string;
  name: string;
  groupName: string | null;
}

interface AnomalyExpense {
  id: string;
  description: string | null;
  amount: number;
  netPaid: number;
  billDate: string;
  contactId: string | null;
  currentCategory: AnomalyCategory | null;
}

interface AnomalyGroup {
  contactName: string;
  majorityCategory: AnomalyCategory;
  majorityCount: number;
  totalCount: number;
  anomalies: AnomalyExpense[];
}

function formatCategoryLabel(cat: AnomalyCategory): string {
  return cat.groupName ? `[${cat.groupName}] ${cat.name}` : cat.name;
}

export default function AnomalyDetectionPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string) || "";

  const [groups, setGroups] = useState<AnomalyGroup[]>([]);
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/${companyCode.toLowerCase()}/expenses/anomalies`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setGroups(json.data.groups);
          setTotalAnomalies(json.data.totalAnomalies);
        }
      }
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const toggleSelectAll = (group: AnomalyGroup) => {
    const ids = group.anomalies.map((e) => e.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyBulkCategory = async () => {
    if (!bulkCategoryId || selectedIds.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch(
        `/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expenseIds: Array.from(selectedIds),
            categoryId: bulkCategoryId,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`แก้หมวด ${json.data.updated} รายการสำเร็จ`);
        setSelectedIds(new Set());
        setBulkCategoryId(null);
        fetchAnomalies();
      } else {
        throw new Error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApplying(false);
    }
  };

  const fixGroup = async (group: AnomalyGroup) => {
    const ids = group.anomalies.map((e) => e.id);
    if (ids.length === 0) return;
    setApplying(true);
    try {
      const res = await fetch(
        `/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expenseIds: ids,
            categoryId: group.majorityCategory.id,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          `แก้หมวด ${json.data.updated} รายการจาก "${group.contactName}" เป็น ${formatCategoryLabel(group.majorityCategory)} สำเร็จ`
        );
        fetchAnomalies();
      } else {
        throw new Error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">ตรวจสอบหมวดหมู่ผิดปกติ</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">ตรวจสอบหมวดหมู่ผิดปกติ</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Check className="h-12 w-12 mb-4 text-green-500" />
            <p className="text-lg font-medium text-foreground">
              ไม่พบหมวดหมู่ผิดปกติ
            </p>
            <p className="text-sm mt-1">
              ค่าใช้จ่ายทุกผู้ติดต่อลงหมวดหมู่สม่ำเสมอดีแล้ว
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">ตรวจสอบหมวดหมู่ผิดปกติ</h1>
            <p className="text-sm text-muted-foreground">
              พบ {totalAnomalies} รายการ จาก {groups.length} ผู้ติดต่อ
              ที่ลงหมวดหมู่ต่างจากส่วนใหญ่
            </p>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5 sticky top-0 z-10">
          <CardContent className="flex items-center gap-4 p-4">
            <Badge variant="secondary">{selectedIds.size} รายการ</Badge>
            <div className="flex-1 max-w-sm">
              <CategorySelector
                value={bulkCategoryId}
                onValueChange={setBulkCategoryId}
                companyCode={companyCode}
                type="EXPENSE"
                placeholder="เลือกหมวดหมู่ที่ถูกต้อง..."
              />
            </div>
            <Button
              onClick={applyBulkCategory}
              disabled={!bulkCategoryId || applying}
              size="sm"
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Tags className="h-4 w-4 mr-1" />
              )}
              จัดหมวด
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Anomaly groups */}
      <div className="space-y-4">
        {groups.map((group) => {
          const allSelected = group.anomalies.every((e) =>
            selectedIds.has(e.id)
          );

          return (
            <Card key={group.contactName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleSelectAll(group)}
                    />
                    <span>{group.contactName}</span>
                    <Badge variant="outline" className="font-normal">
                      ส่วนใหญ่: {formatCategoryLabel(group.majorityCategory)} ({group.majorityCount}/
                      {group.totalCount})
                    </Badge>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    disabled={applying}
                    onClick={() => fixGroup(group)}
                  >
                    <ArrowRight className="h-3 w-3" />
                    แก้ทั้งกลุ่มเป็น {formatCategoryLabel(group.majorityCategory)}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {group.anomalies.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 text-sm"
                    >
                      <Checkbox
                        checked={selectedIds.has(expense.id)}
                        onCheckedChange={() => toggleSelect(expense.id)}
                      />
                      <span className="text-muted-foreground text-xs w-24 shrink-0">
                        {new Date(expense.billDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                      <span className="flex-1 truncate">
                        {expense.description || "-"}
                      </span>
                      {expense.currentCategory && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-xs font-normal"
                        >
                          {formatCategoryLabel(expense.currentCategory)}
                        </Badge>
                      )}
                      <span className="tabular-nums font-medium shrink-0">
                        {formatCurrency(expense.netPaid)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
