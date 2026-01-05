"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Receipt,
  FileText,
  CreditCard,
  Calendar,
  Building2,
  Upload,
  ExternalLink,
  Check,
  ChevronRight,
  Trash2,
  Plus,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
} from "@/lib/validations/expense";
import { use } from "react";
import { cn } from "@/lib/utils";

interface ExpenseDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

interface Expense {
  id: string;
  contact: { id: string; name: string; taxId: string | null } | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  isWht: boolean;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  netPaid: number;
  description: string | null;
  category: string | null;
  invoiceNumber: string | null;
  referenceNo: string | null;
  paymentMethod: string;
  billDate: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  slipUrl: string | null;
  taxInvoiceUrl: string | null;
  whtCertUrl: string | null;
  company: { code: string; name: string };
  creator?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนเงิน",
  CREDIT_CARD: "บัตรเครดิต",
  PROMPTPAY: "พร้อมเพย์",
  CHEQUE: "เช็ค",
};

// Status flow order
const STATUS_FLOW = [
  "WAITING_FOR_DOC",
  "PENDING_PHYSICAL",
  "READY_TO_SEND",
  "SENT_TO_ACCOUNT",
];

const STATUS_INFO: Record<string, { label: string; description: string; color: string }> = {
  WAITING_FOR_DOC: {
    label: "รอใบเสร็จ",
    description: "รอร้านค้าส่งใบเสร็จมา",
    color: "amber",
  },
  PENDING_PHYSICAL: {
    label: "รอส่งบัญชี",
    description: "ได้ใบเสร็จแล้ว รอส่งบัญชี",
    color: "red",
  },
  READY_TO_SEND: {
    label: "พร้อมส่ง",
    description: "รวบรวมเอกสารครบแล้ว",
    color: "yellow",
  },
  SENT_TO_ACCOUNT: {
    label: "ส่งแล้ว",
    description: "ส่งให้บัญชีเรียบร้อย",
    color: "green",
  },
};

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/expenses/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch expense");
      }
      const result = await res.json();
      const expense = result.data?.expense || result.expense;
      setExpense(expense);
      setEditData(expense);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!expense) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          vatAmount: editData.vatAmount,
          whtAmount: editData.whtAmount,
          netPaid: editData.netPaid,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update expense");
      }

      const result = await res.json();
      const updatedExpense = result.data?.expense || result.expense;
      setExpense(updatedExpense);
      setEditData(updatedExpense);
      setIsEditing(false);
      toast.success("บันทึกการแก้ไขสำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleNextStatus = async () => {
    if (!expense) return;

    const currentIndex = STATUS_FLOW.indexOf(expense.status);
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[currentIndex + 1];

    try {
      setSaving(true);
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expense,
          status: nextStatus,
          vatAmount: expense.vatAmount,
          whtAmount: expense.whtAmount,
          netPaid: expense.netPaid,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      const result = await res.json();
      const updatedExpense = result.data?.expense || result.expense;
      setExpense(updatedExpense);
      setEditData(updatedExpense);
      toast.success(`เปลี่ยนสถานะเป็น "${STATUS_INFO[nextStatus].label}" สำเร็จ`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: "slip" | "invoice" | "wht") => {
    if (!expense) return;

    setUploadingType(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `expenses/${expense.id}`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("อัปโหลดไฟล์ล้มเหลว");
      }

      const { url } = await uploadRes.json();

      // Update expense with new file URL
      const updateData: Record<string, string | null> = {};
      if (type === "slip") updateData.slipUrl = url;
      if (type === "invoice") updateData.taxInvoiceUrl = url;
      if (type === "wht") updateData.whtCertUrl = url;

      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expense,
          ...updateData,
          vatAmount: expense.vatAmount,
          whtAmount: expense.whtAmount,
          netPaid: expense.netPaid,
        }),
      });

      if (!res.ok) {
        throw new Error("บันทึกข้อมูลล้มเหลว");
      }

      const result = await res.json();
      const updatedExpense = result.data?.expense || result.expense;
      setExpense(updatedExpense);
      setEditData(updatedExpense);
      toast.success("อัปโหลดไฟล์สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteFile = async (type: "slip" | "invoice" | "wht") => {
    if (!expense) return;

    try {
      setSaving(true);
      const updateData: Record<string, null> = {};
      if (type === "slip") updateData.slipUrl = null;
      if (type === "invoice") updateData.taxInvoiceUrl = null;
      if (type === "wht") updateData.whtCertUrl = null;

      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expense,
          ...updateData,
          vatAmount: expense.vatAmount,
          whtAmount: expense.whtAmount,
          netPaid: expense.netPaid,
        }),
      });

      if (!res.ok) {
        throw new Error("ลบไฟล์ล้มเหลว");
      }

      const result = await res.json();
      const updatedExpense = result.data?.expense || result.expense;
      setExpense(updatedExpense);
      setEditData(updatedExpense);
      toast.success("ลบไฟล์สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentStatusIndex = () => {
    if (!expense) return -1;
    return STATUS_FLOW.indexOf(expense.status);
  };

  const getNextStatusInfo = () => {
    const currentIndex = getCurrentStatusIndex();
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) return null;
    const nextStatus = STATUS_FLOW[currentIndex + 1];
    return STATUS_INFO[nextStatus];
  };

  if (loading) {
    return <LoadingSkeleton companyCode={companyCode} />;
  }

  if (error || !expense) {
    return (
      <div className="space-y-4">
        <Link href={`/${companyCode}/expenses`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-destructive">{error || "ไม่พบรายการ"}</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();
  const nextStatusInfo = getNextStatusInfo();
  const isCompleted = expense.status === "SENT_TO_ACCOUNT";

  return (
    <div className="space-y-6 pb-24">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link href={`/${companyCode}/expenses`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {expense.contact?.name || expense.description || "รายจ่าย"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(expense.billDate).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditData(expense);
              }}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Status Progress Bar */}
      <Card className="overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">สถานะเอกสาร</h3>
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                isCompleted
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
              )}
            >
              {STATUS_INFO[expense.status]?.label || expense.status}
            </Badge>
          </div>

          {/* Progress Steps */}
          <div className="relative">
            <div className="flex justify-between">
              {STATUS_FLOW.map((status, index) => {
                const info = STATUS_INFO[status];
                const isActive = index === currentStatusIndex;
                const isPast = index < currentStatusIndex;
                const isFuture = index > currentStatusIndex;

                return (
                  <div key={status} className="flex flex-col items-center flex-1">
                    {/* Step Circle */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10",
                        isPast && "bg-primary text-primary-foreground",
                        isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                        isFuture && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isPast ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        "text-xs mt-2 text-center",
                        isActive ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress Line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(currentStatusIndex / (STATUS_FLOW.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Amount Card - Hero Section */}
      <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50 dark:border-red-800/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">ยอดจ่ายจริง</p>
            <p className="text-4xl font-bold text-destructive">
              {formatCurrency(Number(expense.netPaid))}
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span>ก่อน VAT: {formatCurrency(Number(expense.amount))}</span>
              {expense.vatRate > 0 && (
                <span>VAT {expense.vatRate}%: {formatCurrency(Number(expense.vatAmount || 0))}</span>
              )}
              {expense.isWht && expense.whtAmount && (
                <span>หัก ณ ที่จ่าย: -{formatCurrency(Number(expense.whtAmount))}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            เอกสารหลักฐาน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploadItem
            label="สลิปโอนเงิน"
            url={expense.slipUrl}
            onUpload={(file) => handleFileUpload(file, "slip")}
            onDelete={() => handleDeleteFile("slip")}
            isUploading={uploadingType === "slip"}
          />
          <DocumentUploadItem
            label="ใบกำกับภาษี / ใบเสร็จ"
            url={expense.taxInvoiceUrl}
            onUpload={(file) => handleFileUpload(file, "invoice")}
            onDelete={() => handleDeleteFile("invoice")}
            isUploading={uploadingType === "invoice"}
          />
          {expense.isWht && (
            <DocumentUploadItem
              label="ใบหัก ณ ที่จ่าย (50 ทวิ)"
              url={expense.whtCertUrl}
              onUpload={(file) => handleFileUpload(file, "wht")}
              onDelete={() => handleDeleteFile("wht")}
              isUploading={uploadingType === "wht"}
            />
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            รายละเอียด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="รายละเอียด"
              value={expense.description}
              isEditing={isEditing}
              editValue={editData.description || ""}
              onEditChange={(v) => setEditData({ ...editData, description: v })}
            />
            <DetailItem
              label="หมวดหมู่"
              value={expense.category ? EXPENSE_CATEGORY_LABELS[expense.category] : null}
            />
            <DetailItem
              label="เลขที่ใบกำกับภาษี"
              value={expense.invoiceNumber}
              isEditing={isEditing}
              editValue={editData.invoiceNumber || ""}
              onEditChange={(v) => setEditData({ ...editData, invoiceNumber: v })}
            />
            <DetailItem
              label="วิธีชำระเงิน"
              value={PAYMENT_METHOD_LABELS[expense.paymentMethod]}
            />
            <DetailItem
              label="ผู้ติดต่อ"
              value={expense.contact?.name}
              icon={<Building2 className="h-3 w-3" />}
            />
            <DetailItem
              label="เลขอ้างอิง"
              value={expense.referenceNo}
              isEditing={isEditing}
              editValue={editData.referenceNo || ""}
              onEditChange={(v) => setEditData({ ...editData, referenceNo: v })}
            />
          </div>

          {/* Notes */}
          <div className="mt-4 pt-4 border-t">
            <Label className="text-muted-foreground text-xs">หมายเหตุ</Label>
            {isEditing ? (
              <Textarea
                value={editData.notes || ""}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="เพิ่มหมายเหตุ..."
                rows={2}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-foreground mt-1">
                {expense.notes || <span className="text-muted-foreground">ไม่มีหมายเหตุ</span>}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meta Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>สร้างโดย: {expense.creator?.name || "-"}</span>
            <span>สร้างเมื่อ: {new Date(expense.createdAt).toLocaleDateString("th-TH")}</span>
            <span>แก้ไขล่าสุด: {new Date(expense.updatedAt).toLocaleDateString("th-TH")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Fixed CTA Button at Bottom */}
      {!isCompleted && nextStatusInfo && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-50">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full h-14 text-base font-medium"
              size="lg"
              onClick={handleNextStatus}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ChevronRight className="mr-2 h-5 w-5" />
              )}
              เปลี่ยนเป็น "{nextStatusInfo.label}"
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {nextStatusInfo.description}
            </p>
          </div>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary/10 backdrop-blur border-t border-primary/20 z-50">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="h-5 w-5" />
              <span className="font-medium">ส่งให้บัญชีเรียบร้อยแล้ว</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Document Upload Component
function DocumentUploadItem({
  label,
  url,
  onUpload,
  onDelete,
  isUploading,
}: {
  label: string;
  url: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
  isUploading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {url ? (
          <ImageIcon className="h-5 w-5 text-primary" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            ดูไฟล์
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">ยังไม่ได้อัปโหลด</p>
        )}
      </div>
      <div className="flex gap-2">
        {url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            variant={url ? "outline" : "default"}
            size="sm"
            className="cursor-pointer"
            asChild
            disabled={isUploading}
          >
            <span>
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : url ? (
                "เปลี่ยน"
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  อัปโหลด
                </>
              )}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}

// Detail Item Component
function DetailItem({
  label,
  value,
  icon,
  isEditing,
  editValue,
  onEditChange,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-muted-foreground text-xs flex items-center gap-1">
        {icon}
        {label}
      </Label>
      {isEditing && onEditChange ? (
        <Input
          value={editValue || ""}
          onChange={(e) => onEditChange(e.target.value)}
          className="mt-1 h-9"
        />
      ) : (
        <p className="text-sm text-foreground mt-1">
          {value || <span className="text-muted-foreground">-</span>}
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton({ companyCode }: { companyCode: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${companyCode}/expenses`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24 mt-1" />
        </div>
      </div>

      <Card>
        <div className="p-4">
          <Skeleton className="h-4 w-20 mb-4" />
          <div className="flex justify-between">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-3 w-16 mt-2" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-10 w-40 mx-auto" />
          </div>
        </CardContent>
      </Card>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
