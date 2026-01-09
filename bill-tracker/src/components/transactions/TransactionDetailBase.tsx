"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
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
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/forms/shared/DatePicker";
import { ContactSelector } from "@/components/forms/shared/ContactSelector";
import { useContacts } from "@/hooks/use-contacts";
import { useCategories } from "@/hooks/use-categories";
import { useTransactionFileUpload } from "@/hooks/use-transaction-file-upload";
import { useTransactionActions } from "@/hooks/use-transaction-actions";
import type { ContactSummary } from "@/types";
import {
  StatusProgressBar,
  DocumentSection,
  TransactionDetailSkeleton,
} from "@/components/transactions";
import { AuditHistorySection } from "@/components/audit-logs/audit-history-section";
import {
  PAYMENT_METHOD_OPTIONS,
  WHT_OPTIONS,
  StatusInfo,
} from "@/lib/constants/transaction";

// ============================================================================
// Types
// ============================================================================

export interface TransactionDetailConfig {
  type: "expense" | "income";
  title: string;
  titleColor: string;
  listUrl: string;
  apiEndpoint: string;
  entityType: "Expense" | "Income";
  
  // Status configuration
  statusFlow: readonly string[];
  statusInfo: Record<string, StatusInfo>;
  completedStatus: string;
  defaultStatus: string;
  
  // Field configurations
  dateField: "billDate" | "receiveDate";
  dateLabel: string;
  netAmountField: "netPaid" | "netReceived";
  netAmountLabel: string;
  whtField: "isWht" | "isWhtDeducted";
  whtLabel: string;
  descriptionField: "description" | "source";
  descriptionLabel: string;
  
  // File URL configurations
  fileFields: {
    slip: { urlsField: string; label: string };
    invoice: { urlsField: string; label: string };
    wht: { urlsField: string; label: string };
  };
  
  // Optional fields
  showDueDate?: boolean;
  showCategory?: boolean;
  categoryLabels?: Record<string, string>;
  
  // Calculate totals function
  calculateTotals: (amount: number, vatRate: number, whtRate: number) => {
    vatAmount: number;
    whtAmount: number;
    netAmount: number;
  };
}

export interface BaseTransaction {
  id: string;
  companyId: string;
  contact: { id: string; name: string; taxId: string | null } | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  paymentMethod: string;
  status: string;
  notes: string | null;
  invoiceNumber: string | null;
  referenceNo: string | null;
  company: { code: string; name: string };
  creator?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface TransactionDetailBaseProps {
  companyCode: string;
  id: string;
  config: TransactionDetailConfig;
}

// ============================================================================
// Component
// ============================================================================

export function TransactionDetailBase({ 
  companyCode, 
  id, 
  config 
}: TransactionDetailBaseProps) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<BaseTransaction>>({});
  const [calculation, setCalculation] = useState({ vatAmount: 0, whtAmount: 0, netAmount: 0 });
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  // Fetch contacts for the selector
  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);

  // Fetch categories for the selector
  const { categories, isLoading: categoriesLoading } = useCategories(
    companyCode,
    config.type.toUpperCase() as "EXPENSE" | "INCOME"
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch transaction
  const fetchTransaction = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.apiEndpoint}/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch ${config.type}`);
      const result = await res.json();
      const data = result.data?.[config.type] || result[config.type];
      
      // If this is an expense that was created from a reimbursement,
      // and it's still PAID status, redirect to reimbursement detail
      // (Note: New reimbursements use ReimbursementRequest model, not Expense)
      if (config.type === "expense" && data?.isReimbursement && data?.reimbursementRequest) {
        router.replace(`/${companyCode.toLowerCase()}/reimbursements/${data.reimbursementRequest.id}`);
        return;
      }
      
      setTransaction(data);
      setEditData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [config.apiEndpoint, config.type, id, router, companyCode]);

  // Refresh both transaction data and audit history
  const refreshAll = useCallback(async () => {
    await fetchTransaction();
    setAuditRefreshKey(prev => prev + 1);
  }, [fetchTransaction]);

  // Use shared hooks
  const { uploadingType, handleFileUpload, handleDeleteFile } = useTransactionFileUpload({
    transactionType: config.type,
    transactionId: id,
    companyCode,
    onSuccess: refreshAll,
  });

  const {
    deleting,
    handleDelete,
    handleNextStatus: nextStatus,
    handlePreviousStatus: prevStatus,
  } = useTransactionActions({
    transactionType: config.type,
    transactionId: id,
    companyCode,
    statusFlow: config.statusFlow,
    statusInfo: config.statusInfo,
    onSuccess: refreshAll,
  });

  // Set selected contact when transaction is loaded
  useEffect(() => {
    if (transaction?.contact) {
      setSelectedContact({
        id: transaction.contact.id,
        name: transaction.contact.name,
        taxId: transaction.contact.taxId,
      });
    }
  }, [transaction?.contact]);

  // Set selected category when transaction is loaded
  useEffect(() => {
    if (transaction?.categoryId) {
      setSelectedCategory(transaction.categoryId);
    }
  }, [transaction?.categoryId]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  // Recalculate when editing
  useEffect(() => {
    if (isEditing && editData.amount !== undefined) {
      const whtEnabled = editData[config.whtField] as boolean;
      const calc = config.calculateTotals(
        Number(editData.amount) || 0,
        Number(editData.vatRate) || 0,
        whtEnabled ? (Number(editData.whtRate) || 0) : 0
      );
      setCalculation(calc);
    }
  }, [isEditing, editData, config]);

  const handleSave = async () => {
    if (!transaction) return;

    try {
      setSaving(true);
      const whtEnabled = editData[config.whtField] as boolean;
      const calc = config.calculateTotals(
        Number(editData.amount) || 0,
        Number(editData.vatRate) || 0,
        whtEnabled ? (Number(editData.whtRate) || 0) : 0
      );

      const res = await fetch(`${config.apiEndpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          contactId: selectedContact?.id || null,
          categoryId: selectedCategory || null,
          amount: Number(editData.amount),
          vatRate: Number(editData.vatRate),
          vatAmount: calc.vatAmount,
          whtRate: whtEnabled ? Number(editData.whtRate) : null,
          whtAmount: whtEnabled ? calc.whtAmount : null,
          [config.netAmountField]: calc.netAmount,
        }),
      });

      if (!res.ok) throw new Error(`Failed to update ${config.type}`);

      const result = await res.json();
      const updatedData = result.data?.[config.type] || result[config.type];
      setTransaction(updatedData);
      setEditData(updatedData);
      setIsEditing(false);
      setAuditRefreshKey(prev => prev + 1);
      toast.success("บันทึกการแก้ไขสำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  // Wrapper functions
  const handleNextStatus = () => {
    if (!transaction) return;
    nextStatus(transaction.status, transaction);
  };

  const handlePreviousStatus = () => {
    if (!transaction) return;
    prevStatus(transaction.status, transaction);
  };

  const handleFileUploadWrapper = async (file: File, type: "slip" | "invoice" | "wht") => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([key, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    await handleFileUpload(file, type, currentUrls, transaction);
  };

  const handleDeleteFileWrapper = async (type: "slip" | "invoice" | "wht", urlToDelete: string) => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([key, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    await handleDeleteFile(type, urlToDelete, currentUrls, transaction);
  };

  const getCurrentStatusIndex = () => 
    transaction ? config.statusFlow.indexOf(transaction.status) : -1;

  const getNextStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx === -1 || idx >= config.statusFlow.length - 1) return null;
    return config.statusInfo[config.statusFlow[idx + 1]];
  };

  const getPreviousStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx <= 0) return null;
    return config.statusInfo[config.statusFlow[idx - 1]];
  };

  if (loading) return <TransactionDetailSkeleton />;

  if (error || !transaction) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-destructive font-medium">{error || "ไม่พบรายการ"}</p>
        <Link href={`/${companyCode}/${config.listUrl}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับหน้า{config.title}
          </Button>
        </Link>
      </div>
    );
  }

  const nextStatusInfo = getNextStatusInfo();
  const previousStatusInfo = getPreviousStatusInfo();
  const statusInfo = config.statusInfo[transaction.status] || config.statusInfo[config.defaultStatus];
  const whtEnabled = transaction[config.whtField] as boolean;
  const dateValue = transaction[config.dateField] as string;
  const netAmount = transaction[config.netAmountField] as number;
  const description = transaction[config.descriptionField] as string | null;
  const isDeleted = !!transaction.deletedAt;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Deleted Warning Banner */}
      {isDeleted && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4 flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">รายการนี้ถูกลบแล้ว</p>
            <p className="text-sm text-muted-foreground">
              ลบเมื่อ {new Date(transaction.deletedAt).toLocaleString("th-TH")}
              {transaction.deletedByUser && ` โดย ${transaction.deletedByUser.name}`}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/${companyCode}/${config.listUrl}`}>
              <Button variant="ghost" size="icon" className={cn("shrink-0 -ml-2 rounded-full", config.titleColor)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                {config.title}
                <Badge className={cn("text-xs shrink-0", statusInfo.bgColor, statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(dateValue).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDeleted ? (
              <Badge variant="destructive" className="gap-1">
                <Trash2 className="h-3 w-3" />
                ถูกลบแล้ว
              </Badge>
            ) : isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsEditing(false); setEditData(transaction); }}
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
                {previousStatusInfo && (
                  <Button variant="outline" size="sm" onClick={handlePreviousStatus} disabled={saving}>
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">ย้อนสถานะ</span>
                  </Button>
                )}
                {nextStatusInfo && (
                  <Button
                    size="sm"
                    onClick={handleNextStatus}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />}
                    <span className="hidden sm:inline">{nextStatusInfo.label}</span>
                    <span className="sm:hidden">ถัดไป</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">แก้ไข</span>
                </Button>
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
        statusFlow={config.statusFlow}
        statusInfo={config.statusInfo}
        currentStatus={transaction.status}
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
              {/* Row 1: Date & Amount (like Create form) */}
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Date */}
                {isEditing ? (
                  <DatePicker
                    label={config.dateLabel}
                    value={editData[config.dateField] ? new Date(editData[config.dateField] as string) : undefined}
                    onChange={(date) => setEditData({ ...editData, [config.dateField]: date?.toISOString() })}
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">{config.dateLabel}</Label>
                    <p className="text-sm font-medium">
                      {new Date(dateValue).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Amount - read only in detail view */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">จำนวนเงิน (ก่อน VAT)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData.amount || ""}
                      onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                      className="h-11 bg-muted/30 text-lg font-semibold"
                    />
                  ) : (
                    <p className="text-lg font-semibold">{formatCurrency(transaction.amount)}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Contact & Category (like Create form) */}
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Contact */}
                {isEditing ? (
                  <ContactSelector
                    contacts={contacts}
                    isLoading={contactsLoading}
                    selectedContact={selectedContact}
                    onSelect={setSelectedContact}
                    label={config.type === "expense" ? "ผู้ติดต่อ / ร้านค้า" : "ลูกค้า / ผู้ติดต่อ"}
                    placeholder="เลือกผู้ติดต่อ..."
                    companyCode={companyCode}
                    onContactCreated={(contact) => {
                      refetchContacts();
                      setSelectedContact(contact);
                    }}
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {config.type === "expense" ? "ผู้ติดต่อ / ร้านค้า" : "ลูกค้า / ผู้ติดต่อ"}
                    </Label>
                    <p className="text-sm font-medium">{transaction.contact?.name || <span className="text-muted-foreground">-</span>}</p>
                  </div>
                )}

                {/* Category - using new Category model */}
                {config.showCategory && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">หมวดหมู่</Label>
                    {isEditing ? (
                      <Select
                        value={selectedCategory || ""}
                        onValueChange={(v) => setSelectedCategory(v || null)}
                        disabled={categoriesLoading}
                      >
                        <SelectTrigger className="h-11 bg-muted/30">
                          <SelectValue placeholder="เลือกหมวดหมู่" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium">
                        {transaction.categoryRef?.name || <span className="text-muted-foreground">-</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Description (like Create form) */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{config.descriptionLabel} <span className="text-red-500">*</span></Label>
                {isEditing ? (
                  <Input
                    value={(editData[config.descriptionField] as string) || ""}
                    onChange={(e) => setEditData({ ...editData, [config.descriptionField]: e.target.value })}
                    placeholder={config.descriptionLabel}
                    className="h-11 bg-muted/30"
                    required
                  />
                ) : (
                  <p className="text-sm font-medium">{description || <span className="text-muted-foreground">-</span>}</p>
                )}
              </div>

              {/* Row 4: Due Date & Payment Method (like Create form) */}
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Due Date (expense only) */}
                {config.showDueDate && (
                  isEditing ? (
                    <DatePicker
                      label="วันครบกำหนด (ถ้ามี)"
                      value={editData.dueDate ? new Date(editData.dueDate as string) : undefined}
                      onChange={(date) => setEditData({ ...editData, dueDate: date?.toISOString() || null })}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">วันครบกำหนด</Label>
                      <p className="text-sm font-medium">
                        {transaction.dueDate
                          ? new Date(transaction.dueDate as string).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
                          : <span className="text-muted-foreground">-</span>
                        }
                      </p>
                    </div>
                  )
                )}

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {config.type === "expense" ? "วิธีชำระเงิน" : "วิธีรับเงิน"}
                  </Label>
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
                      {PAYMENT_METHOD_OPTIONS.find(o => o.value === transaction.paymentMethod)?.label}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 5: Invoice Number & Reference No */}
              <div className="grid sm:grid-cols-2 gap-6">
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
                    <p className="text-sm font-medium">{transaction.invoiceNumber || <span className="text-muted-foreground">-</span>}</p>
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
                    <p className="text-sm font-medium">{transaction.referenceNo || <span className="text-muted-foreground">-</span>}</p>
                  )}
                </div>
              </div>

              {/* Row 6: Status */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">สถานะเอกสาร</Label>
                <p className="text-sm font-medium">{statusInfo.label}</p>
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
                    {(transaction.notes as string) || <span className="text-muted-foreground italic">ไม่มีหมายเหตุ</span>}
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
                  <span className="font-mono font-medium">{formatCurrency(Number(transaction.amount))}</span>
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
                  {!isEditing && <span className="text-sm text-muted-foreground">({transaction.vatRate}%)</span>}
                </div>
                <span className="font-mono">
                  {formatCurrency(isEditing ? calculation.vatAmount : Number(transaction.vatAmount || 0))}
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
                      : Number(transaction.amount as number) + Number((transaction.vatAmount as number) || 0)
                  )}
                </span>
              </div>

              {/* WHT Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">{config.whtLabel}</Label>
                  {isEditing && (
                    <Switch
                      checked={(editData[config.whtField] as boolean) || false}
                      onCheckedChange={(checked) => setEditData({
                        ...editData,
                        [config.whtField]: checked,
                        whtRate: checked ? 3 : null,
                        whtType: checked ? "SERVICE_3" : null,
                      })}
                    />
                  )}
                </div>
                {(isEditing ? editData[config.whtField] : whtEnabled) ? (
                  <span className="font-mono text-destructive">
                    -{formatCurrency(isEditing ? calculation.whtAmount : Number((transaction.whtAmount as number) || 0))}
                  </span>
                ) : null}
              </div>

              {/* WHT Type Selector */}
              {isEditing && editData[config.whtField] && (
                <Select
                  value={(editData.whtType as string) || "SERVICE_3"}
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

              {!isEditing && whtEnabled && transaction.whtType && (
                <div className="text-sm text-muted-foreground">
                  ประเภท: {WHT_OPTIONS.find(o => o.value === transaction.whtType)?.label}
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Net Amount */}
              <div className="flex items-center justify-between pt-2">
                <Label className="text-base font-medium">{config.netAmountLabel}</Label>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(isEditing ? calculation.netAmount : netAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Documents & Audit History */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                {config.type === "expense" ? "หลักฐานการจ่าย" : "หลักฐานการรับเงิน"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentSection
                label={config.fileFields.slip.label}
                urls={(transaction[config.fileFields.slip.urlsField] as string[]) || []}
                onUpload={(file) => handleFileUploadWrapper(file, "slip")}
                onDelete={(url) => handleDeleteFileWrapper("slip", url)}
                isUploading={uploadingType === "slip"}
                icon={<CreditCard className="h-4 w-4" />}
              />

              <DocumentSection
                label={config.fileFields.invoice.label}
                urls={(transaction[config.fileFields.invoice.urlsField] as string[]) || []}
                onUpload={(file) => handleFileUploadWrapper(file, "invoice")}
                onDelete={(url) => handleDeleteFileWrapper("invoice", url)}
                isUploading={uploadingType === "invoice"}
                icon={<FileText className="h-4 w-4" />}
              />

              {whtEnabled && (
                <DocumentSection
                  label={config.fileFields.wht.label}
                  urls={(transaction[config.fileFields.wht.urlsField] as string[]) || []}
                  onUpload={(file) => handleFileUploadWrapper(file, "wht")}
                  onDelete={(url) => handleDeleteFileWrapper("wht", url)}
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
                <span className="font-medium text-foreground">{transaction.creator?.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  วันที่สร้าง
                </span>
                <span>{new Date(transaction.createdAt).toLocaleDateString("th-TH")}</span>
              </div>
            </div>
          </Card>

          {/* Audit History */}
          <AuditHistorySection
            companyId={transaction.companyId}
            entityType={config.entityType}
            entityId={transaction.id}
            refreshKey={auditRefreshKey}
          />
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
                {description || config.title} - {formatCurrency(netAmount)}
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
