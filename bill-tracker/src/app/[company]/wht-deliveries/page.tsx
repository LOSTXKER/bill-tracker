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
  Send,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { DELIVERY_METHODS, getDeliveryMethod } from "@/lib/constants/delivery-methods";

// Format date to Thai locale
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}
import { PermissionGuard } from "@/components/guards/permission-guard";

interface ExpenseItem {
  id: string;
  billDate: string;
  description: string;
  amount: number;
  whtAmount: number;
  whtRate: number;
  whtCertUrls: string[];
  // Expense-level delivery method (override)
  whtDeliveryMethod?: string | null;
  whtDeliveryEmail?: string | null;
  whtDeliveryNotes?: string | null;
}

interface ContactGroup {
  contactId: string;
  contactName: string;
  contact: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    preferredDeliveryMethod?: string;
    deliveryEmail?: string;
    deliveryNotes?: string;
  } | null;
  deliveryMethod: string | null;
  deliveryEmail: string | null;
  deliveryNotes: string | null;
  expenses: ExpenseItem[];
  totalAmount: number;
  totalWhtAmount: number;
  count: number;
}

// DELIVERY_METHODS is imported from @/lib/constants/delivery-methods

export default function WhtDeliveriesPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = params.company as string;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  // Mark sent dialog
  const [showMarkSentDialog, setShowMarkSentDialog] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: swrData, isLoading, mutate: refreshData } = useSWR<{
    data?: { groups?: ContactGroup[]; totalPending?: number };
  }>(
    companyCode ? `/api/${companyCode}/wht-deliveries?groupBy=contact` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const groups: ContactGroup[] = swrData?.data?.groups || [];
  const totalPending: number = swrData?.data?.totalPending || 0;

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

  const handleMarkSent = async () => {
    if (selectedExpenses.size === 0) {
      toast.error("กรุณาเลือกรายการที่ต้องการส่ง");
      return;
    }
    if (!selectedDeliveryMethod) {
      toast.error("กรุณาเลือกวิธีส่ง");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/${companyCode}/wht-deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: Array.from(selectedExpenses),
          deliveryMethod: selectedDeliveryMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message || "อัปเดตสถานะสำเร็จ");
        setShowMarkSentDialog(false);
        setSelectedExpenses(new Set());
        setSelectedDeliveryMethod("");
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

  // Use imported getDeliveryMethod from constants

  return (
    <PermissionGuard permission="expenses:read">
      <div className="container py-6 space-y-6">
        <PageHeader
          title="รอส่งใบ 50 ทวิ"
          description="รายการใบหัก ณ ที่จ่ายที่ออกแล้วแต่ยังไม่ได้ส่งให้ vendor"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refreshData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                รีเฟรช
              </Button>
              {selectedExpenses.size > 0 && (
                <Button 
                  size="sm" 
                  onClick={() => setShowMarkSentDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  ส่งแล้ว ({selectedExpenses.size})
                </Button>
              )}
            </div>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">รอส่งทั้งหมด</div>
              <div className="text-2xl font-bold">{totalPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">จำนวน Vendor</div>
              <div className="text-2xl font-bold">{groups.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">เลือกแล้ว</div>
              <div className="text-2xl font-bold text-emerald-600">{selectedExpenses.size}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">ยอด WHT รวม</div>
              <div className="text-2xl font-bold">
                {formatCurrency(groups.reduce((sum, g) => sum + g.totalWhtAmount, 0))}
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
              <h3 className="text-lg font-semibold mb-2">ไม่มีรายการรอส่ง</h3>
              <p className="text-muted-foreground">
                ใบหัก ณ ที่จ่ายทั้งหมดถูกส่งให้ vendor แล้ว
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.contactId);
              const allSelected = group.expenses.every((e) => selectedExpenses.has(e.id));
              const someSelected = group.expenses.some((e) => selectedExpenses.has(e.id));
              const deliveryInfo = getDeliveryMethod(group.deliveryMethod);

              return (
                <Card key={group.contactId}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(group.contactId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          // @ts-ignore - indeterminate is valid
                          indeterminate={someSelected && !allSelected}
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
                          </CardTitle>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                            {deliveryInfo ? (() => {
                              const Icon = deliveryInfo.Icon;
                              return (
                                <span className="flex items-center gap-1">
                                  <Icon className="h-4 w-4" />
                                  {deliveryInfo.label}
                                  {group.deliveryEmail && group.deliveryMethod === "email" && (
                                    <span className="text-xs">({group.deliveryEmail})</span>
                                  )}
                                </span>
                              );
                            })() : (
                              <span className="text-amber-600">ยังไม่ระบุวิธีส่ง</span>
                            )}
                            {group.deliveryNotes && (
                              <span className="text-xs">• {group.deliveryNotes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(group.totalWhtAmount)}</div>
                        <div className="text-xs text-muted-foreground">ยอด WHT</div>
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
                              <th className="text-right p-2">WHT %</th>
                              <th className="text-right p-2">ยอด WHT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.expenses.map((expense) => {
                              // Check if expense has its own delivery method
                              const expenseDeliveryInfo = expense.whtDeliveryMethod 
                                ? getDeliveryMethod(expense.whtDeliveryMethod) 
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
                                  <td className="p-2">{formatDate(expense.billDate)}</td>
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
                                      {/* Show expense-specific delivery method if set */}
                                      {expenseDeliveryInfo && (() => {
                                        const Icon = expenseDeliveryInfo.Icon;
                                        return (
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                            <Icon className="h-3 w-3" />
                                            <span>{expenseDeliveryInfo.label}</span>
                                            {expense.whtDeliveryMethod === "email" && expense.whtDeliveryEmail && (
                                              <span>({expense.whtDeliveryEmail})</span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">{expense.whtRate}%</td>
                                  <td className="p-2 text-right font-medium">
                                    {formatCurrency(expense.whtAmount)}
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

        {/* Mark Sent Dialog */}
        <Dialog open={showMarkSentDialog} onOpenChange={setShowMarkSentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                บันทึกการส่งใบ 50 ทวิ
              </DialogTitle>
              <DialogDescription>
                เลือก {selectedExpenses.size} รายการ
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>วิธีส่ง</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DELIVERY_METHODS.map((method) => {
                    const Icon = method.Icon;
                    return (
                      <Button
                        key={method.value}
                        type="button"
                        variant={selectedDeliveryMethod === method.value ? "default" : "outline"}
                        className="justify-start gap-2 h-auto py-3"
                        onClick={() => setSelectedDeliveryMethod(method.value)}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{method.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เพิ่มหมายเหตุ..."
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMarkSentDialog(false)} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <LoadingButton 
                onClick={handleMarkSent}
                loading={isSubmitting}
                disabled={!selectedDeliveryMethod}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-4 w-4 mr-2" />
                ยืนยันส่งแล้ว
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
