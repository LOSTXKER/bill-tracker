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
  User,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, calculateIncomeTotals } from "@/lib/utils/tax-calculator";
import { use } from "react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/forms/shared/DatePicker";
import { ContactSelector } from "@/components/forms/shared/ContactSelector";
import { useContacts } from "@/hooks/use-contacts";
import type { ContactSummary } from "@/types";
import {
  StatusProgressBar,
  DocumentSection,
  TransactionDetailSkeleton,
} from "@/components/transactions";
import {
  INCOME_STATUS_FLOW,
  INCOME_STATUS_INFO,
  PAYMENT_METHOD_OPTIONS,
  WHT_OPTIONS,
} from "@/lib/constants/transaction";

interface IncomeDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

interface Income {
  id: string;
  contact: { id: string; name: string; taxId: string | null } | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  isWhtDeducted: boolean;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  netReceived: number;
  source: string | null;
  invoiceNumber: string | null;
  referenceNo: string | null;
  paymentMethod: string;
  receiveDate: string;
  status: string;
  notes: string | null;
  customerSlipUrl: string | null;
  myBillCopyUrl: string | null;
  whtCertUrl: string | null;
  customerSlipUrls?: string[];
  myBillCopyUrls?: string[];
  whtCertUrls?: string[];
  company: { code: string; name: string };
  creator?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function IncomeDetailPage({ params }: IncomeDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const router = useRouter();
  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Income>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [calculation, setCalculation] = useState({ vatAmount: 0, whtAmount: 0, netAmount: 0 });

  // Fetch contacts for the selector
  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);

  useEffect(() => {
    fetchIncome();
  }, [id]);

  // Set selected contact when income is loaded
  useEffect(() => {
    if (income?.contact) {
      setSelectedContact({
        id: income.contact.id,
        name: income.contact.name,
        taxId: income.contact.taxId,
      });
    }
  }, [income?.contact]);

  // Recalculate when editing
  useEffect(() => {
    if (isEditing && editData.amount !== undefined) {
      const calc = calculateIncomeTotals(
        Number(editData.amount) || 0,
        Number(editData.vatRate) || 0,
        editData.isWhtDeducted ? (Number(editData.whtRate) || 0) : 0
      );
      setCalculation({
        vatAmount: calc.vatAmount,
        whtAmount: calc.whtAmount,
        netAmount: calc.netAmount,
      });
    }
  }, [isEditing, editData.amount, editData.vatRate, editData.isWhtDeducted, editData.whtRate]);

  const fetchIncome = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/incomes/${id}`);
      if (!res.ok) throw new Error("Failed to fetch income");
      const result = await res.json();
      const income = result.data?.income || result.income;
      setIncome(income);
      setEditData(income);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!income) return;

    try {
      setSaving(true);

      // Recalculate final values
      const calc = calculateIncomeTotals(
        Number(editData.amount) || 0,
        Number(editData.vatRate) || 0,
        editData.isWhtDeducted ? (Number(editData.whtRate) || 0) : 0
      );

      const res = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          contactId: selectedContact?.id || null,
          amount: Number(editData.amount),
          vatRate: Number(editData.vatRate),
          vatAmount: calc.vatAmount,
          whtRate: editData.isWhtDeducted ? Number(editData.whtRate) : null,
          whtAmount: editData.isWhtDeducted ? calc.whtAmount : null,
          netReceived: calc.netAmount,
        }),
      });

      if (!res.ok) throw new Error("Failed to update income");

      const result = await res.json();
      const updatedIncome = result.data?.income || result.income;
      setIncome(updatedIncome);
      setEditData(updatedIncome);
      setIsEditing(false);
      toast.success("บันทึกการแก้ไขสำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!income) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...income,
          status: newStatus,
          vatAmount: income.vatAmount,
          whtAmount: income.whtAmount,
          netReceived: income.netReceived,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const result = await res.json();
      const updatedIncome = result.data?.income || result.income;
      setIncome(updatedIncome);
      setEditData(updatedIncome);
      toast.success(`เปลี่ยนสถานะเป็น "${INCOME_STATUS_INFO[newStatus].label}" สำเร็จ`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleNextStatus = () => {
    if (!income) return;
    const currentIndex = INCOME_STATUS_FLOW.indexOf(income.status as typeof INCOME_STATUS_FLOW[number]);
    if (currentIndex === -1 || currentIndex >= INCOME_STATUS_FLOW.length - 1) return;
    handleStatusChange(INCOME_STATUS_FLOW[currentIndex + 1]);
  };

  const handlePreviousStatus = () => {
    if (!income) return;
    const currentIndex = INCOME_STATUS_FLOW.indexOf(income.status as typeof INCOME_STATUS_FLOW[number]);
    if (currentIndex <= 0) return;
    handleStatusChange(INCOME_STATUS_FLOW[currentIndex - 1]);
  };

  const handleDelete = async () => {
    if (!income) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "ลบรายการล้มเหลว");
      }

      toast.success("ลบรายการสำเร็จ");
      router.push(`/${companyCode}/incomes`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (file: File, type: "slip" | "bill" | "wht") => {
    if (!income) return;

    setUploadingType(type);
    try {
      // New folder structure: {companyCode}/incomes/{incomeId}/{type}/filename
      const typeFolder = type === "slip" ? "slips" : type === "bill" ? "bills" : "wht";
      const folder = `${companyCode.toUpperCase()}/incomes/${income.id}/${typeFolder}`;
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("อัปโหลดไฟล์ล้มเหลว");

      const { url } = await uploadRes.json();

      const updateData: Record<string, string[]> = {};
      if (type === "slip") updateData.customerSlipUrls = [...(income.customerSlipUrls || []), url];
      if (type === "bill") updateData.myBillCopyUrls = [...(income.myBillCopyUrls || []), url];
      if (type === "wht") updateData.whtCertUrls = [...(income.whtCertUrls || []), url];

      const res = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...income,
          ...updateData,
          vatAmount: income.vatAmount,
          whtAmount: income.whtAmount,
          netReceived: income.netReceived,
        }),
      });

      if (!res.ok) throw new Error("บันทึกข้อมูลล้มเหลว");

      const result = await res.json();
      const updatedIncome = result.data?.income || result.income;
      setIncome(updatedIncome);
      setEditData(updatedIncome);
      toast.success("อัปโหลดไฟล์สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteFile = async (type: "slip" | "bill" | "wht", urlToDelete: string) => {
    if (!income) return;

    try {
      setSaving(true);
      const updateData: Record<string, string[]> = {};

      if (type === "slip") updateData.customerSlipUrls = (income.customerSlipUrls || []).filter(url => url !== urlToDelete);
      if (type === "bill") updateData.myBillCopyUrls = (income.myBillCopyUrls || []).filter(url => url !== urlToDelete);
      if (type === "wht") updateData.whtCertUrls = (income.whtCertUrls || []).filter(url => url !== urlToDelete);

      const res = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...income,
          ...updateData,
          vatAmount: income.vatAmount,
          whtAmount: income.whtAmount,
          netReceived: income.netReceived,
        }),
      });

      if (!res.ok) throw new Error("ลบไฟล์ล้มเหลว");

      const result = await res.json();
      const updatedIncome = result.data?.income || result.income;
      setIncome(updatedIncome);
      setEditData(updatedIncome);
      toast.success("ลบไฟล์สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentStatusIndex = () => income ? INCOME_STATUS_FLOW.indexOf(income.status as typeof INCOME_STATUS_FLOW[number]) : -1;

  const getNextStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx === -1 || idx >= INCOME_STATUS_FLOW.length - 1) return null;
    return INCOME_STATUS_INFO[INCOME_STATUS_FLOW[idx + 1]];
  };

  const getPreviousStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx <= 0) return null;
    return INCOME_STATUS_INFO[INCOME_STATUS_FLOW[idx - 1]];
  };

  if (loading) return <TransactionDetailSkeleton />;

  if (error || !income) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-destructive font-medium">{error || "ไม่พบรายการ"}</p>
        <Link href={`/${companyCode}/incomes`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับหน้ารายรับ
          </Button>
        </Link>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();
  const nextStatusInfo = getNextStatusInfo();
  const previousStatusInfo = getPreviousStatusInfo();
  const isCompleted = income.status === "SENT_COPY";
  const statusInfo = INCOME_STATUS_INFO[income.status] || INCOME_STATUS_INFO.PENDING_COPY_SEND;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/${companyCode}/incomes`}>
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2 rounded-full hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                รายรับ
                <Badge className={cn("text-xs shrink-0", statusInfo.bgColor, statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(income.receiveDate).toLocaleDateString("th-TH", {
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
                  onClick={() => { setIsEditing(false); setEditData(income); }}
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

      {/* Status Progress */}
      <StatusProgressBar
        statusFlow={INCOME_STATUS_FLOW}
        statusInfo={INCOME_STATUS_INFO}
        currentStatus={income.status}
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
              {/* Source */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">แหล่งที่มา / รายละเอียด</Label>
                {isEditing ? (
                  <Input
                    value={editData.source || ""}
                    onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                    placeholder="แหล่งที่มาของรายรับ"
                    className="h-11 bg-muted/30"
                  />
                ) : (
                  <p className="text-sm font-medium">{income.source || <span className="text-muted-foreground">-</span>}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Contact */}
                {isEditing ? (
                  <ContactSelector
                    contacts={contacts}
                    isLoading={contactsLoading}
                    selectedContact={selectedContact}
                    onSelect={setSelectedContact}
                    label="ลูกค้า / ผู้ติดต่อ"
                    placeholder="เลือกผู้ติดต่อ..."
                    companyCode={companyCode}
                    onContactCreated={(contact) => {
                      refetchContacts();
                      setSelectedContact(contact);
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">ลูกค้า / ผู้ติดต่อ</Label>
                    <p className="text-sm font-medium">{income.contact?.name || <span className="text-muted-foreground">-</span>}</p>
                  </div>
                )}

                {/* Date - using DatePicker */}
                {isEditing ? (
                  <DatePicker
                    label="วันที่รับเงิน"
                    value={editData.receiveDate ? new Date(editData.receiveDate) : undefined}
                    onChange={(date) => setEditData({ ...editData, receiveDate: date?.toISOString() })}
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">วันที่รับเงิน</Label>
                    <p className="text-sm font-medium">
                      {new Date(income.receiveDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">เลขที่ใบกำกับภาษี</Label>
                  {isEditing ? (
                    <Input
                      value={editData.invoiceNumber || ""}
                      onChange={(e) => setEditData({ ...editData, invoiceNumber: e.target.value })}
                      placeholder="เลขที่ใบกำกับภาษี"
                      className="h-11 bg-muted/30"
                    />
                  ) : (
                    <p className="text-sm font-medium">{income.invoiceNumber || <span className="text-muted-foreground">-</span>}</p>
                  )}
                </div>

                {/* Reference No */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">เลขอ้างอิง</Label>
                  {isEditing ? (
                    <Input
                      value={editData.referenceNo || ""}
                      onChange={(e) => setEditData({ ...editData, referenceNo: e.target.value })}
                      placeholder="เลขอ้างอิง"
                      className="h-11 bg-muted/30"
                    />
                  ) : (
                    <p className="text-sm font-medium">{income.referenceNo || <span className="text-muted-foreground">-</span>}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">วิธีรับเงิน</Label>
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
                      {PAYMENT_METHOD_OPTIONS.find(o => o.value === income.paymentMethod)?.label}
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
                    {income.notes || <span className="text-muted-foreground italic">ไม่มีหมายเหตุ</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amount Summary Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
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
                  <span className="font-mono font-medium">{formatCurrency(Number(income.amount))}</span>
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
                  {!isEditing && <span className="text-sm text-muted-foreground">({income.vatRate}%)</span>}
                </div>
                <span className="font-mono">
                  {formatCurrency(isEditing ? calculation.vatAmount : Number(income.vatAmount || 0))}
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
                      : Number(income.amount) + Number(income.vatAmount || 0)
                  )}
                </span>
              </div>

              {/* WHT Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">ถูกหัก ณ ที่จ่าย</Label>
                  {isEditing && (
                    <Switch
                      checked={editData.isWhtDeducted || false}
                      onCheckedChange={(checked) => setEditData({
                        ...editData,
                        isWhtDeducted: checked,
                        whtRate: checked ? 3 : null,
                        whtType: checked ? "SERVICE_3" : null,
                      })}
                    />
                  )}
                </div>
                {(isEditing ? editData.isWhtDeducted : income.isWhtDeducted) && (
                  <span className="font-mono text-destructive">
                    -{formatCurrency(isEditing ? calculation.whtAmount : Number(income.whtAmount || 0))}
                  </span>
                )}
              </div>

              {/* WHT Type Selector */}
              {isEditing && editData.isWhtDeducted && (
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

              {!isEditing && income.isWhtDeducted && income.whtType && (
                <div className="text-sm text-muted-foreground">
                  ประเภท: {WHT_OPTIONS.find(o => o.value === income.whtType)?.label}
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Net Amount */}
              <div className="flex items-center justify-between pt-2">
                <Label className="text-base font-medium">ยอดรับสุทธิ</Label>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(isEditing ? calculation.netAmount : Number(income.netReceived))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Documents */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                หลักฐานการรับเงิน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentSection
                label="สลิปโอนจากลูกค้า"
                urls={income.customerSlipUrls || []}
                onUpload={(file) => handleFileUpload(file, "slip")}
                onDelete={(url) => handleDeleteFile("slip", url)}
                isUploading={uploadingType === "slip"}
                icon={<CreditCard className="h-4 w-4" />}
              />

              <DocumentSection
                label="สำเนาบิลขาย"
                urls={income.myBillCopyUrls || []}
                onUpload={(file) => handleFileUpload(file, "bill")}
                onDelete={(url) => handleDeleteFile("bill", url)}
                isUploading={uploadingType === "bill"}
                icon={<FileText className="h-4 w-4" />}
              />

              {income.isWhtDeducted && (
                <DocumentSection
                  label="ใบ 50 ทวิ (จากลูกค้า)"
                  urls={income.whtCertUrls || []}
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
                <span className="font-medium text-foreground">{income.creator?.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  วันที่สร้าง
                </span>
                <span>{new Date(income.createdAt).toLocaleDateString("th-TH")}</span>
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
                {income.source || "รายรับ"} - {formatCurrency(Number(income.netReceived))}
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
