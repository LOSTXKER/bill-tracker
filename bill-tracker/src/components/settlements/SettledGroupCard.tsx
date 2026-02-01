"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
  Undo2,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Payment {
  id: string;
  amount: number;
  paidByType: string;
  paidByUserId: string | null;
  paidByName: string | null;
  settlementStatus: string;
  settledAt: string | null;
  settlementRef: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  Expense: {
    id: string;
    description: string | null;
    billDate: string;
    netPaid: number;
    invoiceNumber: string | null;
    deletedAt: string | null;
    Contact: {
      id: string;
      name: string;
    } | null;
  };
  PaidByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  SettledByUser: {
    id: string;
    name: string;
  } | null;
}

interface Group {
  payerType: string;
  payerId: string | null;
  payerName: string;
  totalAmount: number;
  payments: Payment[];
}

interface SettledGroupCardProps {
  group: Group;
  companyCode: string;
  onSuccess: () => void;
}

export function SettledGroupCard({
  group,
  companyCode,
  onSuccess,
}: SettledGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  
  // Create expense dialog
  const [showCreateExpenseDialog, setShowCreateExpenseDialog] = useState(false);
  const [expenseNotes, setExpenseNotes] = useState("");
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);

  const handleReverseClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setReverseReason("");
    setShowReverseDialog(true);
  };

  const handleCreateExpense = async () => {
    setIsCreatingExpense(true);
    
    try {
      // Get all non-deleted payment IDs from this group
      const paymentIds = group.payments
        .filter(p => !p.Expense.deletedAt)
        .map(p => p.id);

      const response = await fetch(
        `/api/${companyCode}/settlements/create-expense`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            paymentIds,
            notes: expenseNotes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "ไม่สามารถสร้างรายจ่ายได้");
        return;
      }

      toast.success(data.data.message || "สร้างรายจ่ายสำเร็จ");
      setShowCreateExpenseDialog(false);
      setExpenseNotes("");
      
      // Optionally navigate to the new expense
      // window.location.href = `/${companyCode}/expenses/${data.data.expense.id}`;
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsCreatingExpense(false);
    }
  };

  const handleReverseConfirm = async () => {
    if (!selectedPaymentId || !reverseReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการยกเลิก");
      return;
    }

    const paymentId = selectedPaymentId;
    const reason = reverseReason.trim();

    // OPTIMIZED: Optimistic update - close dialog immediately for better UX
    toast.success("ยกเลิกการโอนคืนสำเร็จ");
    setShowReverseDialog(false);
    setReverseReason("");
    setSelectedPaymentId(null);
    setIsReversing(false);
    onSuccess(); // Trigger batch revalidation

    // Fire API request in background
    try {
      const response = await fetch(
        `/api/${companyCode}/settlements/${paymentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        onSuccess(); // Re-fetch to get actual state
      }
    } catch (error) {
      toast.error("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง");
      onSuccess(); // Re-fetch to get actual state
    }
  };

  return (
    <>
      <Card className="border-green-200 dark:border-green-900/50">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {group.payerName}
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      โอนคืนแล้ว
                    </Badge>
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">
                    ฿{group.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.payments.length} รายการ
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => setShowCreateExpenseDialog(true)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  สร้างรายจ่าย
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
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
              <div className="border rounded-lg divide-y">
                {group.payments.map((payment) => {
                  const isDeleted = !!payment.Expense.deletedAt;
                  
                  return (
                    <div
                      key={payment.id}
                      className={`flex items-center justify-between p-3 hover:bg-muted/50 ${
                        isDeleted ? "bg-red-50 dark:bg-red-900/10" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isDeleted ? (
                            <span className="font-medium text-sm text-muted-foreground line-through flex items-center gap-1">
                              <Trash2 className="h-3 w-3 text-red-500" />
                              {payment.Expense.description || "ไม่ระบุรายละเอียด"}
                            </span>
                          ) : (
                            <Link
                              href={`/${companyCode}/expenses/${payment.Expense.id}`}
                              className="font-medium text-sm hover:underline truncate"
                            >
                              {payment.Expense.description || "ไม่ระบุรายละเอียด"}
                            </Link>
                          )}
                          {!isDeleted && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          {isDeleted && (
                            <Badge variant="destructive" className="text-xs">
                              รายจ่ายถูกลบ
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {payment.Expense.Contact && (
                            <span>{payment.Expense.Contact.name}</span>
                          )}
                          {payment.Expense.invoiceNumber && (
                            <>
                              <span>•</span>
                              <span>{payment.Expense.invoiceNumber}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {new Date(payment.Expense.billDate).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                          {payment.settledAt && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">
                                โอนคืนเมื่อ{" "}
                                {new Date(payment.settledAt).toLocaleDateString("th-TH", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <span className="font-medium">
                            ฿{Number(payment.amount).toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            โอนคืนแล้ว
                          </div>
                        </div>
                        {!isDeleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => handleReverseClick(payment.id)}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            ยกเลิก
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reverse Settlement Dialog */}
      <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-orange-500" />
              ยกเลิกการโอนคืน
            </DialogTitle>
            <DialogDescription>
              รายการจะกลับสู่สถานะ &quot;รอโอนคืน&quot; และคุณสามารถแก้ไขรายจ่ายหรือโอนคืนใหม่ได้
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">เหตุผลในการยกเลิก *</Label>
              <Textarea
                id="reason"
                placeholder="เช่น บันทึกจำนวนเงินผิด, ใส่ผู้จ่ายผิดคน..."
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReverseDialog(false)}
              disabled={isReversing}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleReverseConfirm}
              disabled={isReversing || !reverseReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isReversing ? "กำลังดำเนินการ..." : "ยืนยันยกเลิกการโอนคืน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={showCreateExpenseDialog} onOpenChange={setShowCreateExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              สร้างรายจ่ายจากการโอนคืน
            </DialogTitle>
            <DialogDescription>
              สร้างรายการรายจ่ายเพื่อบันทึกการโอนเงินออกจากบัญชีบริษัท
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">โอนคืนให้</span>
                <span className="font-medium">{group.payerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">จำนวนรายการ</span>
                <span className="font-medium">{group.payments.filter(p => !p.Expense.deletedAt).length} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">ยอดรวม</span>
                <span className="font-semibold text-blue-600">
                  ฿{group.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="expenseNotes">หมายเหตุ (ถ้ามี)</Label>
              <Textarea
                id="expenseNotes"
                placeholder="เช่น เลขที่บัญชีที่โอน, วันที่โอน..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateExpenseDialog(false)}
              disabled={isCreatingExpense}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreateExpense}
              disabled={isCreatingExpense}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingExpense ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  สร้างรายจ่าย
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
