"use client";

import { useState, useEffect } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import useSWR from "swr";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Upload,
  X,
  Save,
  Pencil,
  Building2,
  User,
  Image as ImageIcon,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/utils/fetcher";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { formatThaiDateTime } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MembersSWRResponse = {
  data: { members: Array<{ id: string; name: string; email?: string }> };
};

type CategoriesSWRResponse = {
  data: { categories: Array<{ id: string; name: string }> };
};

type AccountsSWRResponse = {
  data: { accounts: Array<{ id: string; name: string; code: string }> };
};

export interface SettlementTransferData {
  id: string;
  description: string | null;
  contactName: string | null;
  amount: number;
  netPaid: number;
  billDate: string;
  notes: string | null;
  slipUrls: string[];
  workflowStatus: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string } | null;
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

interface FormProps {
  mode: "create" | "view" | "edit";
  companyCode: string;
  data?: SettlementTransferData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  onModeChange?: (mode: "view" | "edit") => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettlementTransferForm({
  mode,
  companyCode,
  data,
  open,
  onOpenChange,
  onSuccess,
  onModeChange,
}: FormProps) {
  const { data: session } = useSession();
  const isCreate = mode === "create";
  const isView = mode === "view";

  // Form state
  const [contactName, setContactName] = useState(data?.contactName || "");
  const [amount, setAmount] = useState(data?.netPaid?.toString() || "");
  const [billDate, setBillDate] = useState(
    data?.billDate ? new Date(data.billDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(data?.notes || "");
  const [slipUrls, setSlipUrls] = useState<string[]>(data?.slipUrls || []);
  const [payerType, setPayerType] = useState<"USER" | "COMPANY">(
    (data?.payments[0]?.paidByType as "USER" | "COMPANY") || "COMPANY"
  );
  const [payerUserId, setPayerUserId] = useState(data?.payments[0]?.paidByUserId || "");
  const [categoryId, setCategoryId] = useState(data?.categoryId || "");
  const [accountId, setAccountId] = useState(data?.accountId || "");

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form on data change
  useEffect(() => {
    if (data) {
      setContactName(data.contactName || "");
      setAmount(data.netPaid?.toString() || "");
      setBillDate(
        data.billDate ? new Date(data.billDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      );
      setNotes(data.notes || "");
      setSlipUrls(data.slipUrls || []);
      setPayerType((data.payments[0]?.paidByType as "USER" | "COMPANY") || "COMPANY");
      setPayerUserId(data.payments[0]?.paidByUserId || "");
      setCategoryId(data.categoryId || "");
      setAccountId(data.accountId || "");
    }
  }, [data]);

  // Fetch dropdowns
  const shouldFetch = isCreate ? open : !isView;
  const { data: membersData } = useSWR<MembersSWRResponse>(
    shouldFetch ? `/api/${companyCode}/members` : null,
    fetcher
  );
  const { data: categoriesData } = useSWR<CategoriesSWRResponse>(
    shouldFetch ? `/api/${companyCode}/categories` : null,
    fetcher
  );
  const { data: accountsData } = useSWR<AccountsSWRResponse>(
    shouldFetch ? `/api/${companyCode}/accounts` : null,
    fetcher
  );

  const members = membersData?.data?.members || [];
  const categories = categoriesData?.data?.categories || [];
  const accounts = accountsData?.data?.accounts || [];

  // Set default payer
  useEffect(() => {
    if (isCreate && session?.user?.id && !payerUserId) {
      setPayerUserId(session.user.id);
    }
  }, [isCreate, session?.user?.id, payerUserId]);

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fileName = `${companyCode}/settlements/${Date.now()}-${file.name}`;
        const { data: uploadData, error } = await supabase.storage
          .from("bill-tracker")
          .upload(fileName, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from("bill-tracker")
          .getPublicUrl(uploadData.path);
        uploaded.push(urlData.publicUrl);
      }
      setSlipUrls((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error("ไม่สามารถอัปโหลดไฟล์ได้");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!contactName.trim()) {
      toast.error("กรุณาระบุชื่อพนักงาน");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        contactName: contactName.trim(),
        amount: parsedAmount,
        billDate,
        notes: notes.trim() || undefined,
        slipUrls,
        payerType,
        payerUserId: payerType === "USER" ? payerUserId : null,
        categoryId: categoryId || null,
        accountId: accountId || null,
      };

      const isEdit = mode === "edit" && data?.id;
      const url = isEdit
        ? `/api/expenses/${data.id}`
        : `/api/${companyCode}/settlement-transfers`;
      const method = isEdit ? "PUT" : "POST";

      // For edit mode, transform to match the expense update API shape
      const body = isEdit
        ? {
            contactName: payload.contactName,
            amount: payload.amount,
            netPaid: payload.amount,
            vatRate: 0,
            billDate: payload.billDate,
            notes: payload.notes,
            slipUrls: payload.slipUrls,
            categoryId: payload.categoryId,
            accountId: payload.accountId,
          }
        : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "เกิดข้อผิดพลาด");
      }

      toast.success(isEdit ? "บันทึกการแก้ไขสำเร็จ" : "สร้างรายการโอนเงินคืนสำเร็จ");
      onSuccess?.();
      if (isEdit) onModeChange?.("view");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------
  // Form content (shared between create sheet and view/edit page)
  // -------------------------------------------------------------------
  const formContent = (
    <div className="space-y-5">
      {/* Employee name */}
      <div className="space-y-2">
        <Label>ชื่อพนักงาน <span className="text-destructive">*</span></Label>
        {isView ? (
          <p className="text-sm font-medium">{data?.contactName || "-"}</p>
        ) : (
          <Input
            placeholder="ชื่อพนักงานที่ต้องโอนคืน"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            disabled={isSubmitting}
          />
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label>จำนวนเงิน (บาท) <span className="text-destructive">*</span></Label>
        {isView ? (
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(data?.netPaid || 0)}
          </p>
        ) : (
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label>วันที่โอน</Label>
        {isView ? (
          <p className="text-sm">
            {data?.billDate
              ? new Date(data.billDate).toLocaleDateString(APP_LOCALE, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: APP_TIMEZONE,
                })
              : "-"}
          </p>
        ) : (
          <Input
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            disabled={isSubmitting}
          />
        )}
      </div>

      {/* Payer */}
      <div className="space-y-2">
        <Label>ผู้จ่ายเงิน</Label>
        {isView ? (
          <p className="text-sm">
            {data?.payments[0]?.paidByType === "COMPANY"
              ? "บัญชีบริษัท"
              : data?.payments[0]?.paidByUser?.name || "-"}
          </p>
        ) : (
          <Select
            value={payerType === "COMPANY" ? "COMPANY" : payerUserId}
            onValueChange={(v) => {
              if (v === "COMPANY") {
                setPayerType("COMPANY");
                setPayerUserId("");
              } else {
                setPayerType("USER");
                setPayerUserId(v);
              }
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกผู้จ่ายเงิน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPANY">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>บัญชีบริษัท</span>
                </div>
              </SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{m.name}</span>
                    {m.id === session?.user?.id && (
                      <span className="text-xs text-muted-foreground">(ตัวเอง)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Slips */}
      <div className="space-y-2">
        <Label>สลิปการโอน</Label>
        {isView ? (
          slipUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slipUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-20 h-20 rounded-lg border overflow-hidden hover:ring-2 ring-primary transition-all"
                >
                  <img src={url} alt={`Slip ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ไม่มีสลิป</p>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            {slipUrls.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg border overflow-hidden">
                <img src={url} alt={`Slip ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setSlipUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading || isSubmitting}
              />
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">เพิ่ม</span>
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>หมายเหตุ</Label>
        {isView ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {data?.notes || "-"}
          </p>
        ) : (
          <Textarea
            placeholder="เลขอ้างอิงการโอน หรือหมายเหตุเพิ่มเติม"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        )}
      </div>

      {/* Category & Account */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>หมวดหมู่</Label>
          {isView ? (
            <p className="text-sm">{data?.category?.name || "-"}</p>
          ) : (
            <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>ผังบัญชี</Label>
          {isView ? (
            <p className="text-sm">
              {data?.account ? `${data.account.code} - ${data.account.name}` : "-"}
            </p>
          ) : (
            <Select value={accountId || "__none__"} onValueChange={(v) => setAccountId(v === "__none__" ? "" : v)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกผังบัญชี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Metadata (view only) */}
      {isView && data && (
        <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
          <p>สร้างโดย: {data.creator?.name || "-"}</p>
          <p>สร้างเมื่อ: {formatThaiDateTime(data.createdAt)}</p>
          <p>อัปเดตล่าสุด: {formatThaiDateTime(data.updatedAt)}</p>
        </div>
      )}

      {/* Actions */}
      {!isView && (
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === "edit" ? "บันทึกการแก้ไข" : "สร้างรายการโอนคืน"}
              </>
            )}
          </Button>
          {mode === "edit" && (
            <Button
              variant="outline"
              onClick={() => onModeChange?.("view")}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------------
  // Create mode: render inside a Sheet
  // -------------------------------------------------------------------
  if (isCreate) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-violet-500" />
              สร้างรายการโอนเงินคืน
            </SheetTitle>
            <SheetDescription>
              บันทึกรายการโอนเงินคืนให้พนักงาน
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">{formContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // -------------------------------------------------------------------
  // View / Edit mode: render as a card (for the detail page)
  // -------------------------------------------------------------------
  return (
    <div className="rounded-xl border bg-card p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
          >
            โอนคืน
          </Badge>
          <h2 className="text-lg font-semibold">
            {data?.contactName || "รายการโอนเงินคืน"}
          </h2>
        </div>
        {isView && (
          <Button variant="outline" size="sm" onClick={() => onModeChange?.("edit")}>
            <Pencil className="mr-1.5 h-4 w-4" />
            แก้ไข
          </Button>
        )}
      </div>
      {formContent}
    </div>
  );
}
