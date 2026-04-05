"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountSelector } from "@/components/forms/shared/account-selector";
import { ArrowLeft, Check, Loader2, Sparkles, Tags } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface UncategorizedExpense {
  id: string;
  description: string;
  amount: number;
  netPaid: number;
  billDate: string;
  contactId: string | null;
  contactName: string | null;
}

export default function BulkCategorizePage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string) || "";

  const [expenses, setExpenses] = useState<UncategorizedExpense[]>([]);
  const [grouped, setGrouped] = useState<Record<string, UncategorizedExpense[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAccountId, setBulkAccountId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [aiSuggestingGroup, setAiSuggestingGroup] = useState<string | null>(null);
  const [groupAccountSuggestions, setGroupAccountSuggestions] = useState<Record<string, string>>({});

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${companyCode.toLowerCase()}/expenses/uncategorized`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setExpenses(json.data.expenses);
          setGrouped(json.data.grouped);
        }
      }
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const toggleSelectAll = (contactKey: string) => {
    const ids = (grouped[contactKey] || []).map((e) => e.id);
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

  const applyBulkAccount = async () => {
    if (!bulkAccountId || selectedIds.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: Array.from(selectedIds),
          accountId: bulkAccountId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`จัดหมวด ${json.data.updated} รายการสำเร็จ`);
        setSelectedIds(new Set());
        setBulkAccountId(null);
        fetchExpenses();
      } else {
        throw new Error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApplying(false);
    }
  };

  const applyToGroup = async (contactKey: string, accountId: string) => {
    const ids = (grouped[contactKey] || []).map((e) => e.id);
    if (ids.length === 0 || !accountId) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: ids, accountId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`จัดหมวด ${json.data.updated} รายการจาก "${contactKey === "__no_contact__" ? "ไม่ระบุผู้ติดต่อ" : contactKey}" สำเร็จ`);
        fetchExpenses();
      } else {
        throw new Error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApplying(false);
    }
  };

  const aiSuggestForGroup = async (contactKey: string) => {
    const sample = (grouped[contactKey] || [])[0];
    if (!sample) return;

    setAiSuggestingGroup(contactKey);
    try {
      const text = [sample.description, sample.contactName].filter(Boolean).join(" - ");
      const res = await fetch("/api/ai/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, companyCode, type: "expense" }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.account?.id) {
          setGroupAccountSuggestions((prev) => ({ ...prev, [contactKey]: json.data.account.id }));
          toast.success(`AI แนะนำ: ${json.data.account.code} ${json.data.account.name}`);
        } else {
          toast.info("AI ไม่สามารถระบุบัญชีได้");
        }
      }
    } catch {
      toast.error("ไม่สามารถวิเคราะห์ได้");
    } finally {
      setAiSuggestingGroup(null);
    }
  };

  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">จัดหมวดค่าใช้จ่าย</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">จัดหมวดค่าใช้จ่าย</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Check className="h-12 w-12 mb-4 text-green-500" />
            <p className="text-lg font-medium text-foreground">ค่าใช้จ่ายทั้งหมดมีบัญชีแล้ว</p>
            <p className="text-sm mt-1">ไม่มีรายการที่ต้องจัดหมวด</p>
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
            <h1 className="text-xl font-semibold">จัดหมวดค่าใช้จ่าย</h1>
            <p className="text-sm text-muted-foreground">
              {expenses.length} รายการยังไม่ระบุบัญชี
            </p>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <Badge variant="secondary">{selectedIds.size} รายการ</Badge>
            <div className="flex-1 max-w-sm">
              <AccountSelector
                value={bulkAccountId}
                onValueChange={setBulkAccountId}
                companyCode={companyCode}
                placeholder="เลือกบัญชีสำหรับรายการที่เลือก..."
                filterClass="EXPENSE"
              />
            </div>
            <Button
              onClick={applyBulkAccount}
              disabled={!bulkAccountId || applying}
              size="sm"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Tags className="h-4 w-4 mr-1" />}
              จัดหมวด
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped expenses */}
      <div className="space-y-4">
        {sortedGroups.map(([contactKey, items]) => {
          const displayName = contactKey === "__no_contact__" ? "ไม่ระบุผู้ติดต่อ" : contactKey;
          const allSelected = items.every((e) => selectedIds.has(e.id));
          const groupAccountId = groupAccountSuggestions[contactKey] || null;
          const totalAmount = items.reduce((sum, e) => sum + e.netPaid, 0);

          return (
            <Card key={contactKey}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleSelectAll(contactKey)}
                    />
                    {displayName}
                    <Badge variant="outline" className="ml-1">{items.length}</Badge>
                    <span className="text-muted-foreground font-normal">
                      {formatCurrency(totalAmount)}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => aiSuggestForGroup(contactKey)}
                      disabled={aiSuggestingGroup === contactKey}
                    >
                      {aiSuggestingGroup === contactKey ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI แนะนำ
                    </Button>
                    <div className="w-56">
                      <AccountSelector
                        value={groupAccountId}
                        onValueChange={(val) => {
                          setGroupAccountSuggestions((prev) => ({
                            ...prev,
                            [contactKey]: val || "",
                          }));
                        }}
                        companyCode={companyCode}
                        placeholder="เลือกบัญชี..."
                        filterClass="EXPENSE"
                        suggestedAccountId={groupAccountId || undefined}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={!groupAccountId || applying}
                      onClick={() => groupAccountId && applyToGroup(contactKey, groupAccountId)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      ใช้กับทั้งกลุ่ม
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {items.map((expense) => (
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
                      <span className="flex-1 truncate">{expense.description || "-"}</span>
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
