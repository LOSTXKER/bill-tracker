"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Receipt,
  FileText,
  CreditCard,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Banknote,
  User,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, calculateExpenseTotals } from "@/lib/utils/tax-calculator";
import { use } from "react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/forms/shared/DatePicker";
import { useCategories } from "@/hooks/use-categories";
import {
  StatusProgressBar,
  DocumentSection,
  TransactionDetailSkeleton,
} from "@/components/transactions";
import {
  EXPENSE_STATUS_FLOW,
  EXPENSE_STATUS_INFO,
  PAYMENT_METHOD_OPTIONS,
  WHT_OPTIONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/lib/constants/transaction";

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
  slipUrls?: string[];
  taxInvoiceUrls?: string[];
  whtCertUrls?: string[];
  company: { code: string; name: string };
  creator?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [calculation, setCalculation] = useState({ vatAmount: 0, whtAmount: 0, netAmount: 0 });

  // Fetch categories for the selector
  const { categories, isLoading: categoriesLoading } = useCategories(companyCode, "EXPENSE");

  useEffect(() => {
    fetchExpense();
  }, [id]);

  // Recalculate when editing
  useEffect(() => {
    if (isEditing && editData.amount !== undefined) {
      const calc = calculateExpenseTotals(
        Number(editData.amount) || 0,
        Number(editData.vatRate) || 0,
        editData.isWht ? (Number(editData.whtRate) || 0) : 0
      );
      setCalculation({
        vatAmount: calc.vatAmount,
        whtAmount: calc.whtAmount,
        netAmount: calc.netAmount,
      });
    }
  }, [isEditing, editData.amount, editData.vatRate, editData.isWht, editData.whtRate]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/expenses/${id}`);
      if (!res.ok) throw new Error("Failed to fetch expense");
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

      // Recalculate final values
      const calc = calculateExpenseTotals(
        Number(editData.amount) || 0,
        Number(editData.vatRate) || 0,
        editData.isWht ? (Number(editData.whtRate) || 0) : 0
      );

      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          amount: Number(editData.amount),
          vatRate: Number(editData.vatRate),
          vatAmount: calc.vatAmount,
          whtRate: editData.isWht ? Number(editData.whtRate) : null,
          whtAmount: editData.isWht ? calc.whtAmount : null,
          netPaid: calc.netAmount,
        }),
      });

      if (!res.ok) throw new Error("Failed to update expense");

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

  const handleStatusChange = async (newStatus: string) => {
    if (!expense) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expense,
          status: newStatus,
          vatAmount: expense.vatAmount,
          whtAmount: expense.whtAmount,
          netPaid: expense.netPaid,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const result = await res.json();
      const updatedExpense = result.data?.expense || result.expense;
      setExpense(updatedExpense);
      setEditData(updatedExpense);
      toast.success(`เปลี่ยนสถานะเป็น "${EXPENSE_STATUS_INFO[newStatus].label}" สำเร็จ`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleNextStatus = () => {
    if (!expense) return;
    const currentIndex = EXPENSE_STATUS_FLOW.indexOf(expense.status as typeof EXPENSE_STATUS_FLOW[number]);
    if (currentIndex === -1 || currentIndex >= EXPENSE_STATUS_FLOW.length - 1) return;
    handleStatusChange(EXPENSE_STATUS_FLOW[currentIndex + 1]);
  };

  const handlePreviousStatus = () => {
    if (!expense) return;
    const currentIndex = EXPENSE_STATUS_FLOW.indexOf(expense.status as typeof EXPENSE_STATUS_FLOW[number]);
    if (currentIndex <= 0) return;
    handleStatusChange(EXPENSE_STATUS_FLOW[currentIndex - 1]);
  };

  const handleDelete = async () => {
    if (!expense) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "ลบรายการล้มเหลว");
      }

      toast.success("ลบรายการสำเร็จ");
      router.push(`/${companyCode}/expenses`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (file: File, type: "slip" | "invoice" | "wht") => {
    if (!expense) return;

    setUploadingType(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `expenses/${expense.id}`);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("อัปโหลดไฟล์ล้มเหลว");

      const { url } = await uploadRes.json();

      const updateData: Record<string, string[]> = {};
      if (type === "slip") updateData.slipUrls = [...(expense.slipUrls || []), url];
      if (type === "invoice") updateData.taxInvoiceUrls = [...(expense.taxInvoiceUrls || []), url];
      if (type === "wht") updateData.whtCertUrls = [...(expense.whtCertUrls || []), url];

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

      if (!res.ok) throw new Error("บันทึกข้อมูลล้มเหลว");

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

  const handleDeleteFile = async (type: "slip" | "invoice" | "wht", urlToDelete: string) => {
    if (!expense) return;

    try {
      setSaving(true);
      const updateData: Record<string, string[]> = {};

      if (type === "slip") updateData.slipUrls = (expense.slipUrls || []).filter(url => url !== urlToDelete);
      if (type === "invoice") updateData.taxInvoiceUrls = (expense.taxInvoiceUrls || []).filter(url => url !== urlToDelete);
      if (type === "wht") updateData.whtCertUrls = (expense.whtCertUrls || []).filter(url => url !== urlToDelete);

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

      if (!res.ok) throw new Error("ลบไฟล์ล้มเหลว");

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

  const getCurrentStatusIndex = () => expense ? EXPENSE_STATUS_FLOW.indexOf(expense.status as typeof EXPENSE_STATUS_FLOW[number]) : -1;

  const getNextStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx === -1 || idx >= EXPENSE_STATUS_FLOW.length - 1) return null;
    return EXPENSE_STATUS_INFO[EXPENSE_STATUS_FLOW[idx + 1]];
  };

  const getPreviousStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx <= 0) return null;
    return EXPENSE_STATUS_INFO[EXPENSE_STATUS_FLOW[idx - 1]];
  };

  if (loading) return <TransactionDetailSkeleton />;

  if (error || !expense) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-destructive font-medium">{error || "ไม่พบรายการ"}</p>
        <Link href={`/${companyCode}/expenses`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับหน้ารายจ่าย
          </Button>
        </Link>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();
  const nextStatusInfo = getNextStatusInfo();
  const previousStatusInfo = getPreviousStatusInfo();
  const isCompleted = expense.status === "SENT_TO_ACCOUNT";
  const statusInfo = EXPENSE_STATUS_INFO[expense.status] || EXPENSE_STATUS_INFO.PENDING_PHYSICAL;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/${companyCode}/expenses`}>
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2 rounded-full hover:bg-destructive/10 hover:text-destructive">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                รายจ่าย
                <Badge className={cn("text-xs shrink-0", statusInfo.bgColor, statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(expense.billDate).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsEditing(false); setEditData(expense); }}
                  disabled={saving}
                >
                  <X className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">ยกเลิก</span>
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1" /> : <Save className="h-4 w-4 sm:mr-1" />}
                  <span className="hidden sm:inline">บันทึก</span>
                </Button>
              </div>
            ) : (
              <>
                {/* Previous Status Button */}
                {previousStatusInfo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousStatus}
                    disabled={saving}
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">ย้อนสถานะ</span>
                  </Button>
                )}

                {/* Next Status Button */}
                {nextStatusInfo && (
                  <Button
                    size="sm"
                    onClick={handleNextStatus}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
                    ) : null}
                    <span className="hidden sm:inline">{nextStatusInfo.label}</span>
                    <span className="sm:hidden">ถัดไป</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                )}

                {/* Edit Button */}
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">แก้ไข</span>
                </Button>

                {/* Delete Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">ลบ</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Progress - Using shared component */}
      <StatusProgressBar
        statusFlow={EXPENSE_STATUS_FLOW}
        statusInfo={EXPENSE_STATUS_INFO}
        currentStatus={expense.status}
        className="mb-6"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                รายละเอียดเอกสาร
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">รายละเอียด</Label>
                {isEditing ? (
                  <Input
                    value={editData.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="รายละเอียดค่าใช้จ่าย"
                    className="h-11 bg-muted/30"
                  />
                ) : (
                  <p className="text-sm font-medium">{expense.description || <span className="text-muted-foreground">-</span>}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Category with colors */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">หมวดหมู่</Label>
                  {isEditing ? (
                    <Select
                      value={editData.category || ""}
                      onValueChange={(v) => setEditData({ ...editData, category: v })}
                    >
                      <SelectTrigger className="h-11 bg-muted/30">
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CATEGORY_COLORS[value] }}
                              />
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {expense.category && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
                        />
                      )}
                      <p className="text-sm font-medium">
                        {expense.category ? CATEGORY_LABELS[expense.category] : <span className="text-muted-foreground">-</span>}
                      </p>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">ผู้ติดต่อ / ร้านค้า</Label>
                  <p className="text-sm font-medium">{expense.contact?.name || <span className="text-muted-foreground">-</span>}</p>
                </div>

                {/* Date - using DatePicker */}
                {isEditing ? (
                  <DatePicker
                    label="วันที่จ่ายเงิน"
                    value={editData.billDate ? new Date(editData.billDate) : undefined}
                    onChange={(date) => setEditData({ ...editData, billDate: date?.toISOString() })}
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">วันที่จ่ายเงิน</Label>
                    <p className="text-sm font-medium">
                      {new Date(expense.billDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Due Date - using DatePicker */}
                {isEditing ? (
                  <DatePicker
                    label="วันครบกำหนด"
                    value={editData.dueDate ? new Date(editData.dueDate) : undefined}
                    onChange={(date) => setEditData({ ...editData, dueDate: date?.toISOString() || null })}
                  />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">วันครบกำหนด</Label>
                    <p className="text-sm font-medium">
                      {expense.dueDate
                        ? new Date(expense.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
                        : <span className="text-muted-foreground">-</span>
                      }
                    </p>
                  </div>
                )}

                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">เลขที่ใบกำกับ</Label>
                  {isEditing ? (
                    <Input
                      value={editData.invoiceNumber || ""}
                      onChange={(e) => setEditData({ ...editData, invoiceNumber: e.target.value })}
                      placeholder="เลขที่ใบกำกับภาษี"
                      className="h-11 bg-muted/30"
                    />
                  ) : (
                    <p className="text-sm font-medium">{expense.invoiceNumber || <span className="text-muted-foreground">-</span>}</p>
                  )}
                </div>

                {/* Reference No */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">เลขอ้างอิงการจ่าย</Label>
                  {isEditing ? (
                    <Input
                      value={editData.referenceNo || ""}
                      onChange={(e) => setEditData({ ...editData, referenceNo: e.target.value })}
                      placeholder="เลขอ้างอิง"
                      className="h-11 bg-muted/30"
                    />
                  ) : (
                    <p className="text-sm font-medium">{expense.referenceNo || <span className="text-muted-foreground">-</span>}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">วิธีชำระเงิน</Label>
                  {isEditing ? (
                    <Select
                      value={editData.paymentMethod || "BANK_TRANSFER"}
                      onValueChange={(v) => setEditData({ ...editData, paymentMethod: v })}
                    >
                      <SelectTrigger className="h-11 bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium">
                      {PAYMENT_METHOD_OPTIONS.find(o => o.value === expense.paymentMethod)?.label}
                    </p>
                  )}
                </div>

                {/* Status - Display only */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">สถานะ</Label>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", statusInfo.dotColor)} />
                    <span className="text-sm font-medium">{statusInfo.label}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">หมายเหตุ</Label>
                {isEditing ? (
                  <Textarea
                    value={editData.notes || ""}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="เพิ่มหมายเหตุ..."
                    rows={3}
                    className="bg-muted/30 resize-none"
                  />
                ) : (
                  <p className="text-sm p-3 rounded-lg bg-muted/30 min-h-[60px] whitespace-pre-wrap">
                    {expense.notes || <span className="text-muted-foreground italic">ไม่มีหมายเหตุ</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amount Summary Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                รายละเอียดยอดเงิน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount before tax */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">จำนวนเงินก่อนภาษี</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.amount || ""}
                    onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
                    className="w-40 h-10 text-right bg-muted/30"
                    placeholder="0.00"
                  />
                ) : (
                  <span className="font-mono font-medium">{formatCurrency(Number(expense.amount))}</span>
                )}
              </div>

              {/* VAT */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">VAT</Label>
                  {isEditing && (
                    <Select
                      value={String(editData.vatRate || 0)}
                      onValueChange={(v) => setEditData({ ...editData, vatRate: Number(v) })}
                    >
                      <SelectTrigger className="w-20 h-8 bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="7">7%</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {!isEditing && <span className="text-sm text-muted-foreground">({expense.vatRate}%)</span>}
                </div>
                <span className="font-mono">
                  {formatCurrency(isEditing ? calculation.vatAmount : Number(expense.vatAmount || 0))}
                </span>
              </div>

              <div className="h-px bg-border" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">รวมเป็นเงิน</Label>
                <span className="font-mono font-medium">
                  {formatCurrency(
                    isEditing
                      ? (Number(editData.amount) || 0) + calculation.vatAmount
                      : Number(expense.amount) + Number(expense.vatAmount || 0)
                  )}
                </span>
              </div>

              {/* WHT Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">หัก ณ ที่จ่าย</Label>
                  {isEditing && (
                    <Switch
                      checked={editData.isWht || false}
                      onCheckedChange={(checked) => setEditData({
                        ...editData,
                        isWht: checked,
                        whtRate: checked ? 3 : null,
                        whtType: checked ? "SERVICE_3" : null,
                      })}
                    />
                  )}
                </div>
                {(isEditing ? editData.isWht : expense.isWht) && (
                  <span className="font-mono text-destructive">
                    -{formatCurrency(isEditing ? calculation.whtAmount : Number(expense.whtAmount || 0))}
                  </span>
                )}
              </div>

              {/* WHT Type Selector */}
              {isEditing && editData.isWht && (
                <Select
                  value={editData.whtType || "SERVICE_3"}
                  onValueChange={(v) => {
                    const opt = WHT_OPTIONS.find(o => o.value === v);
                    setEditData({
                      ...editData,
                      whtType: v,
                      whtRate: opt?.rate || 0,
                    });
                  }}
                >
                  <SelectTrigger className="h-10 bg-muted/30">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    {WHT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {!isEditing && expense.isWht && expense.whtType && (
                <div className="text-sm text-muted-foreground">
                  ประเภท: {WHT_OPTIONS.find(o => o.value === expense.whtType)?.label}
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Net Amount */}
              <div className="flex items-center justify-between pt-2">
                <Label className="text-base font-medium">ยอดชำระสุทธิ</Label>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(isEditing ? calculation.netAmount : Number(expense.netPaid))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Documents - Using shared DocumentSection */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                หลักฐานการจ่าย
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentSection
                label="สลิปโอนเงิน"
                urls={expense.slipUrls || []}
                onUpload={(file) => handleFileUpload(file, "slip")}
                onDelete={(url) => handleDeleteFile("slip", url)}
                isUploading={uploadingType === "slip"}
                icon={<CreditCard className="h-4 w-4" />}
              />

              <DocumentSection
                label="ใบกำกับภาษี / ใบเสร็จ"
                urls={expense.taxInvoiceUrls || []}
                onUpload={(file) => handleFileUpload(file, "invoice")}
                onDelete={(url) => handleDeleteFile("invoice", url)}
                isUploading={uploadingType === "invoice"}
                icon={<FileText className="h-4 w-4" />}
              />

              {expense.isWht && (
                <DocumentSection
                  label="หนังสือรับรองหัก ณ ที่จ่าย"
                  urls={expense.whtCertUrls || []}
                  onUpload={(file) => handleFileUpload(file, "wht")}
                  onDelete={(url) => handleDeleteFile("wht", url)}
                  isUploading={uploadingType === "wht"}
                  icon={<FileText className="h-4 w-4" />}
                />
              )}
            </CardContent>

            {/* Meta Info */}
            <div className="px-6 py-4 border-t bg-muted/30 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  สร้างโดย
                </span>
                <span className="font-medium text-foreground">{expense.creator?.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  วันที่สร้าง
                </span>
                <span>{new Date(expense.createdAt).toLocaleDateString("th-TH")}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบรายการนี้ใช่หรือไม่? การลบสามารถกู้คืนได้โดยผู้ดูแลระบบ
              <br />
              <span className="font-medium text-foreground">
                {expense.description || "รายจ่าย"} - {formatCurrency(Number(expense.netPaid))}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบรายการ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
