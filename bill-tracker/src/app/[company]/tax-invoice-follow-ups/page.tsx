"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-config";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  Clock,
  Phone,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { TAX_INVOICE_REQUEST_METHODS, getTaxInvoiceRequestMethod } from "@/lib/constants/delivery-methods";
import { PermissionGuard } from "@/components/guards/permission-guard";

// Format date to Thai locale
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ExpenseItem {
  id: string;
  billDate: string;
  description: string;
  amount: number;
  vatAmount: number;
  netPaid: number;
  daysPending: number;
  taxInvoiceRequestedAt: string | null;
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
}

interface ContactGroup {
  contactId: string;
  contactName: string;
  contact: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    taxInvoiceRequestMethod?: string;
    taxInvoiceRequestEmail?: string;
    taxInvoiceRequestNotes?: string;
  } | null;
  requestMethod: string | null;
  requestEmail: string | null;
  requestNotes: string | null;
  contactPhone: string | null;
  expenses: ExpenseItem[];
  totalAmount: number;
  count: number;
  oldestDays: number;
}

function DaysBadge({ days }: { days: number }) {
  if (days <= 7) {
    return (
      <Badge variant="secondary" className="text-xs">
        {days} วัน
      </Badge>
    );
  }
  if (days <= 14) {
    return (
      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
        {days} วัน
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-xs">
      {days} วัน
    </Badge>
  );
}

export default function TaxInvoiceFollowUpsPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = params.company as string;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  // Dialogs
  const [showRequestedDialog, setShowRequestedDialog] = useState(false);
  const [showReceivedDialog, setShowReceivedDialog] = useState(false);
  const [selectedRequestMethod, setSelectedRequestMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: swrData, isLoading, mutate: refreshData } = useSWR<{
    data?: { groups?: ContactGroup[]; totalPending?: number; totalAmount?: number; oldestDays?: number };
  }>(
    companyCode ? `/api/${companyCode}/tax-invoice-follow-ups?groupBy=contact` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups: ContactGroup[] = swrData?.data?.groups || [];
  const totalPending: number = swrData?.data?.totalPending || 0;
  const totalAmount: number = swrData?.data?.totalAmount || 0;
  const oldestDays: number = swrData?.data?.oldestDays || 0;

  // Auto-expand all groups when data first loads
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map((g) => g.contactId)));
    }
  }, [groups.length]);

  const toggleGroup = (contactId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(contactId)) {
      newExpanded.delete(contactId);
    } else {
      newExpanded.add(contactId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const toggleAllInGroup = (group: ContactGroup) => {
    const allSelected = group.expenses.every((e) => selectedExpenses.has(e.id));
    const newSelected = new Set(selectedExpenses);

    if (allSelected) {
      group.expenses.forEach((e) => newSelected.delete(e.id));
    } else {
      group.expenses.forEach((e) => newSelected.add(e.id));
    }
    setSelectedExpenses(newSelected);
  };

  const handleMarkRequested = async () => {
    if (selectedExpenses.size === 0) {
      toast.error("กรุณาเลือกรายการ");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/${companyCode}/tax-invoice-follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: Array.from(selectedExpenses),
          action: "mark_requested",
          requestMethod: selectedRequestMethod || undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message || "บันทึกสำเร็จ");
        setShowRequestedDialog(false);
        setSelectedExpenses(new Set());
        setSelectedRequestMethod("");
        setNotes("");
        refreshData();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkReceived = async () => {
    if (selectedExpenses.size === 0) {
      toast.error("กรุณาเลือกรายการ");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/${companyCode}/tax-invoice-follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: Array.from(selectedExpenses),
          action: "mark_received",
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message || "บันทึกสำเร็จ");
        setShowReceivedDialog(false);
        setSelectedExpenses(new Set());
        setNotes("");
        refreshData();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PermissionGuard permission="expenses:read">
      <div className="container py-6 space-y-6">
        <PageHeader
          title="ตามใบกำกับภาษี"
          description="รายการค่าใช้จ่ายที่รอใบกำกับภาษีจาก Vendor จัดกลุ่มตามร้าน/ผู้ติดต่อ"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refreshData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                รีเฟรช
              </Button>
              {selectedExpenses.size > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRequestedDialog(true)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    ขอแล้ว ({selectedExpenses.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowReceivedDialog(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    ได้รับแล้ว ({selectedExpenses.size})
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">รอใบกำกับทั้งหมด</div>
              <div className="text-2xl font-bold">{totalPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">จำนวนร้าน/Vendor</div>
              <div className="text-2xl font-bold">{groups.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">ยอดรวม</div>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">ค้างนานสุด</div>
              <div className={`text-2xl font-bold ${oldestDays > 14 ? "text-destructive" : oldestDays > 7 ? "text-amber-600" : ""}`}>
                {oldestDays} วัน
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">ไม่มีรายการรอใบกำกับ</h3>
              <p className="text-muted-foreground">
                ใบกำกับภาษีทั้งหมดได้รับครบแล้ว
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.contactId);
              const allSelected = group.expenses.every((e) => selectedExpenses.has(e.id));
              const someSelected = group.expenses.some((e) => selectedExpenses.has(e.id));
              const requestMethodInfo = getTaxInvoiceRequestMethod(group.requestMethod);

              return (
                <Card key={group.contactId}>
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(group.contactId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={someSelected && !allSelected ? "indeterminate" : allSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAllInGroup(group);
                          }}
                        />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {group.contactName}
                            <Badge variant="secondary">{group.count} รายการ</Badge>
                            {group.oldestDays > 14 && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                ค้าง {group.oldestDays} วัน
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                            {/* Request method */}
                            {requestMethodInfo ? (() => {
                              const Icon = requestMethodInfo.Icon;
                              return (
                                <span className="flex items-center gap-1">
                                  <Icon className="h-4 w-4" />
                                  {requestMethodInfo.label}
                                  {group.requestMethod === "email" && group.requestEmail && (
                                    <span className="text-xs">({group.requestEmail})</span>
                                  )}
                                </span>
                              );
                            })() : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                ยังไม่ระบุช่องทาง
                              </span>
                            )}
                            {/* Phone */}
                            {group.contactPhone && (
                              <span className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3" />
                                {group.contactPhone}
                              </span>
                            )}
                            {/* Notes */}
                            {group.requestNotes && (
                              <span className="text-xs">• {group.requestNotes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(group.totalAmount)}</div>
                        <div className="text-xs text-muted-foreground">ยอดรวม</div>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="w-8 p-2"></th>
                              <th className="text-left p-2">วันที่</th>
                              <th className="text-left p-2">รายละเอียด</th>
                              <th className="text-right p-2">จำนวนเงิน</th>
                              <th className="text-center p-2">รอมาแล้ว</th>
                              <th className="text-left p-2">ขอล่าสุด</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.expenses.map((expense) => {
                              const expenseMethodInfo = expense.taxInvoiceRequestMethod
                                ? getTaxInvoiceRequestMethod(expense.taxInvoiceRequestMethod)
                                : null;

                              return (
                                <tr
                                  key={expense.id}
                                  className="border-t hover:bg-muted/30 cursor-pointer"
                                  onClick={() => toggleExpense(expense.id)}
                                >
                                  <td className="p-2">
                                    <Checkbox
                                      checked={selectedExpenses.has(expense.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      onCheckedChange={() => toggleExpense(expense.id)}
                                    />
                                  </td>
                                  <td className="p-2 whitespace-nowrap">{formatDate(expense.billDate)}</td>
                                  <td className="p-2">
                                    <div>
                                      <span
                                        className="hover:underline text-primary cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/${companyCode}/expenses/${expense.id}`);
                                        }}
                                      >
                                        {expense.description || "-"}
                                      </span>
                                      {expenseMethodInfo && (() => {
                                        const Icon = expenseMethodInfo.Icon;
                                        return (
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                            <Icon className="h-3 w-3" />
                                            <span>{expenseMethodInfo.label}</span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td className="p-2 text-right font-medium">
                                    {formatCurrency(expense.amount)}
                                  </td>
                                  <td className="p-2 text-center">
                                    <DaysBadge days={expense.daysPending} />
                                  </td>
                                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                                    {expense.taxInvoiceRequestedAt
                                      ? formatDateTime(expense.taxInvoiceRequestedAt)
                                      : <span className="text-amber-600">ยังไม่ได้ขอ</span>
                                    }
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Mark as Requested Dialog */}
        <Dialog open={showRequestedDialog} onOpenChange={setShowRequestedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                บันทึกการขอใบกำกับ
              </DialogTitle>
              <DialogDescription>
                เลือก {selectedExpenses.size} รายการ - บันทึกว่าได้ขอใบกำกับจาก Vendor แล้ว
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>ขอผ่านช่องทาง (ถ้ามี)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TAX_INVOICE_REQUEST_METHODS.map((method) => {
                    const Icon = method.Icon;
                    return (
                      <Button
                        key={method.value}
                        type="button"
                        variant={selectedRequestMethod === method.value ? "default" : "outline"}
                        className="justify-start gap-2 h-auto py-3"
                        onClick={() =>
                          setSelectedRequestMethod(
                            selectedRequestMethod === method.value ? "" : method.value
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{method.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="requestNotes">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  id="requestNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น โทรหาคุณสมชาย แจ้งว่าจะส่งภายในสัปดาห์หน้า..."
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestedDialog(false)} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <LoadingButton
                onClick={handleMarkRequested}
                loading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Clock className="h-4 w-4 mr-2" />
                บันทึกว่าขอแล้ว
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark as Received Dialog */}
        <Dialog open={showReceivedDialog} onOpenChange={setShowReceivedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                ได้รับใบกำกับภาษี
              </DialogTitle>
              <DialogDescription>
                เลือก {selectedExpenses.size} รายการ - บันทึกว่าได้รับใบกำกับจาก Vendor แล้ว
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="receivedNotes">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  id="receivedNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เพิ่มหมายเหตุ..."
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReceivedDialog(false)} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <LoadingButton
                onClick={handleMarkReceived}
                loading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                ยืนยันได้รับแล้ว
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
