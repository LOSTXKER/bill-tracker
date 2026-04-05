"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CategorySelector } from "@/components/forms/shared/CategorySelector";
import { ArrowLeft, Check, Loader2, Pencil, Sparkles, Tags } from "lucide-react";
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

const PAGE_TITLE = "จัดหมวดหมู่ค่าใช้จ่าย";

function InlineDescriptionEditor({
  expense,
  companyCode,
  onSaved,
}: {
  expense: UncategorizedExpense;
  companyCode: string;
  onSaved: (id: string, newDesc: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(expense.description || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed === (expense.description || "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-description",
          expenseId: expense.id,
          description: trimmed,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        onSaved(expense.id, trimmed);
        toast.success("บันทึกคำอธิบายแล้ว");
      } else {
        throw new Error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setValue(expense.description || "");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex-1 flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setValue(expense.description || "");
              setEditing(false);
            }
          }}
          disabled={saving}
          className="h-7 text-sm"
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex-1 flex items-center gap-1 group text-left min-w-0"
      onClick={() => setEditing(true)}
    >
      <span className="truncate">{expense.description || "-"}</span>
      <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

export default function BulkCategorizePage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string) || "";

  const [expenses, setExpenses] = useState<UncategorizedExpense[]>([]);
  const [grouped, setGrouped] = useState<Record<string, UncategorizedExpense[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [aiSuggestingGroup, setAiSuggestingGroup] = useState<string | null>(null);
  const [aiSuggestingBulk, setAiSuggestingBulk] = useState(false);
  const [groupCategorySuggestions, setGroupCategorySuggestions] = useState<Record<string, string>>({});

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

  const updateExpenseDescription = (id: string, newDesc: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, description: newDesc } : e))
    );
    setGrouped((prev) => {
      const next: Record<string, UncategorizedExpense[]> = {};
      for (const [key, items] of Object.entries(prev)) {
        next[key] = items.map((e) => (e.id === id ? { ...e, description: newDesc } : e));
      }
      return next;
    });
  };

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

  const applyBulkCategory = async () => {
    if (!bulkCategoryId || selectedIds.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: Array.from(selectedIds),
          categoryId: bulkCategoryId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`จัดหมวด ${json.data.updated} รายการสำเร็จ`);
        setSelectedIds(new Set());
        setBulkCategoryId(null);
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

  const applyToGroup = async (contactKey: string, categoryId: string) => {
    const ids = (grouped[contactKey] || []).map((e) => e.id);
    if (ids.length === 0 || !categoryId) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/expenses/bulk-categorize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: ids, categoryId }),
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

  const buildDescriptions = (items: UncategorizedExpense[]) => {
    const unique = new Map<string, string>();
    for (const item of items) {
      const parts = [item.description, item.contactName].filter(Boolean);
      const line = parts.join(" - ");
      if (line) unique.set(line, line);
    }
    return Array.from(unique.values()).slice(0, 15);
  };

  const callSuggestCategory = async (items: UncategorizedExpense[]) => {
    const descriptions = buildDescriptions(items);
    if (descriptions.length === 0) throw new Error("ไม่มีรายละเอียด");

    const res = await fetch(`/api/${companyCode.toLowerCase()}/ai/suggest-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptions, type: "expense" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "AI วิเคราะห์ไม่สำเร็จ");
    }
    return json.data as {
      categoryId: string | null;
      categoryName: string;
      groupName: string;
      isNew: boolean;
      confidence: number;
      suggestNewName?: string;
      suggestNewParent?: string;
      reason?: string;
    };
  };

  const showAiResult = (cat: Awaited<ReturnType<typeof callSuggestCategory>>) => {
    if (!cat.categoryId) {
      const label = cat.suggestNewName
        ? `แนะนำสร้างหมวดใหม่: "${cat.suggestNewName}" ในกลุ่ม "${cat.suggestNewParent || cat.groupName}"`
        : "ไม่พบหมวดที่เหมาะสม กรุณาสร้างหมวดใหม่";
      toast.info(label, { duration: 6000 });
      return false;
    }
    toast.success(`AI แนะนำ: [${cat.groupName}] ${cat.categoryName}`);
    return true;
  };

  const aiSuggestForGroup = async (contactKey: string) => {
    const items = grouped[contactKey] || [];
    if (items.length === 0) return;

    setAiSuggestingGroup(contactKey);
    try {
      const cat = await callSuggestCategory(items);
      if (cat.categoryId) {
        setGroupCategorySuggestions((prev) => ({ ...prev, [contactKey]: cat.categoryId! }));
      }
      showAiResult(cat);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สามารถวิเคราะห์ได้");
    } finally {
      setAiSuggestingGroup(null);
    }
  };

  const aiSuggestForSelected = async () => {
    if (selectedIds.size === 0) return;
    const selected = expenses.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;

    setAiSuggestingBulk(true);
    try {
      const cat = await callSuggestCategory(selected);
      if (cat.categoryId) {
        setBulkCategoryId(cat.categoryId);
      }
      showAiResult(cat);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สามารถวิเคราะห์ได้");
    } finally {
      setAiSuggestingBulk(false);
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
          <h1 className="text-xl font-semibold">{PAGE_TITLE}</h1>
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
          <h1 className="text-xl font-semibold">{PAGE_TITLE}</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Check className="h-12 w-12 mb-4 text-green-500" />
            <p className="text-lg font-medium text-foreground">ค่าใช้จ่ายทั้งหมดมีหมวดหมู่แล้ว</p>
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
            <h1 className="text-xl font-semibold">{PAGE_TITLE}</h1>
            <p className="text-sm text-muted-foreground">
              {expenses.length} รายการยังไม่ระบุหมวดหมู่ — คลิกคำอธิบายเพื่อแก้ไข
            </p>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <Badge variant="secondary">{selectedIds.size} รายการ</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={aiSuggestForSelected}
              disabled={aiSuggestingBulk}
            >
              {aiSuggestingBulk ? (
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
                type="EXPENSE"
                placeholder="เลือกหมวดหมู่สำหรับรายการที่เลือก..."
              />
            </div>
            <Button
              onClick={applyBulkCategory}
              disabled={!bulkCategoryId || applying}
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
          const groupCategoryId = groupCategorySuggestions[contactKey] || null;
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
                      <CategorySelector
                        value={groupCategoryId}
                        onValueChange={(val) => {
                          setGroupCategorySuggestions((prev) => ({
                            ...prev,
                            [contactKey]: val || "",
                          }));
                        }}
                        companyCode={companyCode}
                        type="EXPENSE"
                        placeholder="เลือกหมวดหมู่..."
                        suggestedCategoryId={groupCategoryId || undefined}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={!groupCategoryId || applying}
                      onClick={() => groupCategoryId && applyToGroup(contactKey, groupCategoryId)}
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
                      <InlineDescriptionEditor
                        expense={expense}
                        companyCode={companyCode}
                        onSaved={updateExpenseDescription}
                      />
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
