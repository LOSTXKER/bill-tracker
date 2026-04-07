"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-config";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { StatsGrid } from "@/components/shared/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileSearch,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RefreshCw,
  Clock,
  Phone,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { formatThaiDateTimeShort } from "@/lib/utils/formatters";
import { TAX_INVOICE_REQUEST_METHODS, getTaxInvoiceRequestMethod } from "@/lib/constants/delivery-methods";
import { PermissionGuard } from "@/components/guards/permission-guard";

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

  const stats = [
    {
      title: "รอใบกำกับทั้งหมด",
      value: `${totalPending}`,
      subtitle: "รายการ",
      icon: "file-text",
      iconColor: "text-amber-500",
      featured: true,
    },
    {
      title: "จำนวนร้าน/Vendor",
      value: `${groups.length}`,
      subtitle: "ร้าน",
      icon: "wallet",
      iconColor: "text-primary",
    },
    {
      title: "ยอดรวม",
      value: formatCurrency(totalAmount),
      subtitle: "ทั้งหมด",
      icon: "arrow-up-circle",
      iconColor: "text-primary",
    },
    {
      title: "ค้างนานสุด",
      value: `${oldestDays} วัน`,
      subtitle: oldestDays > 14 ? "เกินกำหนด" : "ปกติ",
      icon: "clock",
      iconColor: oldestDays > 14 ? "text-destructive" : oldestDays > 7 ? "text-amber-500" : "text-primary",
    },
  ];

  return (
    <PermissionGuard permission="expenses:read">
      <div className="space-y-6">
        <PageHeader
          icon={FileSearch}
          title="ตามใบกำกับภาษี"
          description="รายการค่าใช้จ่ายที่รอใบกำกับภาษีจาก Vendor จัดกลุ่มตามร้าน/ผู้ติดต่อ"
          actions={
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData()}
                className="h-8 text-muted-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
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
                    <Clock className="h-4 w-4 mr-1.5" />
                    ขอแล้ว ({selectedExpenses.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowReceivedDialog(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <FileCheck className="h-4 w-4 mr-1.5" />
                    ได้รับแล้ว ({selectedExpenses.size})
                  </Button>
                </>
              )}
            </div>
          }
        />

        <StatsGrid stats={stats} />

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3 stagger-children">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-7 w-7 rounded" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="border-border/50 shadow-card">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">ไม่มีรายการรอใบกำกับ</h3>
              <p className="text-muted-foreground">
                ใบกำกับภาษีทั้งหมดได้รับครบแล้ว
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 stagger-children">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.contactId);
              const allSelected = group.expenses.every((e) => selectedExpenses.has(e.id));
              const someSelected = group.expenses.some((e) => selectedExpenses.has(e.id));
              const requestMethodInfo = getTaxInvoiceRequestMethod(group.requestMethod);
              const initials = (group.contactName || "?").charAt(0).toUpperCase();

              return (
                <Card key={group.contactId} className="border-border/50 shadow-card transition-all duration-200 hover:shadow-md">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.contactId)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate">
                                {group.contactName}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                {group.count} รายการ
                              </Badge>
                              {group.oldestDays > 14 && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 shrink-0">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  ค้าง {group.oldestDays} วัน
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              {requestMethodInfo ? (() => {
                                const Icon = requestMethodInfo.Icon;
                                return (
                                  <span className="flex items-center gap-1">
                                    <Icon className="h-3 w-3" />
                                    {requestMethodInfo.label}
                                    {group.requestMethod === "EMAIL" && group.requestEmail && (
                                      <span>({group.requestEmail})</span>
                                    )}
                                  </span>
                                );
                              })() : (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  ยังไม่ระบุช่องทาง
                                </span>
                              )}
                              {group.contactPhone && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {group.contactPhone}
                                  </span>
                                </>
                              )}
                              {group.requestNotes && (
                                <>
                                  <span>·</span>
                                  <span>{group.requestNotes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="font-semibold text-sm tabular-nums">
                            {formatCurrency(group.totalAmount)}
                          </p>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border rounded-lg overflow-hidden">
                          <Table className="table-fixed">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40px]">
                                  <Checkbox
                                    checked={someSelected && !allSelected ? "indeterminate" : allSelected}
                                    onCheckedChange={() => toggleAllInGroup(group)}
                                  />
                                </TableHead>
                                <TableHead className="w-[100px]">วันที่</TableHead>
                                <TableHead>รายละเอียด</TableHead>
                                <TableHead className="text-right w-[130px]">จำนวนเงิน</TableHead>
                                <TableHead className="text-center w-[100px]">รอมาแล้ว</TableHead>
                                <TableHead className="w-[140px]">ขอล่าสุด</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.expenses.map((expense) => {
                                const expenseMethodInfo = expense.taxInvoiceRequestMethod
                                  ? getTaxInvoiceRequestMethod(expense.taxInvoiceRequestMethod)
                                  : null;

                                return (
                                  <TableRow
                                    key={expense.id}
                                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                                    onClick={() => toggleExpense(expense.id)}
                                  >
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedExpenses.has(expense.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onCheckedChange={() => toggleExpense(expense.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">
                                      {formatThaiDate(new Date(expense.billDate))}
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <span
                                          className="hover:underline text-primary cursor-pointer text-sm font-medium"
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
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-sm tabular-nums">
                                      {formatCurrency(expense.amount)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <DaysBadge days={expense.daysPending} />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                      {expense.taxInvoiceRequestedAt
                                        ? formatThaiDateTimeShort(expense.taxInvoiceRequestedAt)
                                        : <span className="text-amber-600">ยังไม่ได้ขอ</span>
                                      }
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
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
                className="bg-primary hover:bg-primary/90"
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
