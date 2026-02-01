"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Image as ImageIcon,
  Undo2,
  Trash2,
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
  settlementSlipUrls: string[];
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

interface SettlementRound {
  roundKey: string;
  settledAt: string;
  settlementRef: string | null;
  settlementSlipUrls: string[];
  settledBy: {
    id: string;
    name: string;
  } | null;
  payments: Payment[];
  totalAmount: number;
  payerSummary: string;
}

interface SettlementRoundsTableProps {
  rounds: SettlementRound[];
  companyCode: string;
  onSuccess: () => void;
}

export function SettlementRoundsTable({
  rounds,
  companyCode,
  onSuccess,
}: SettlementRoundsTableProps) {
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const [selectedSlipUrls, setSelectedSlipUrls] = useState<string[]>([]);

  const toggleExpand = (roundKey: string) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(roundKey)) {
      newExpanded.delete(roundKey);
    } else {
      newExpanded.add(roundKey);
    }
    setExpandedRounds(newExpanded);
  };

  const handleReverseClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setReverseReason("");
    setShowReverseDialog(true);
  };

  const handleReverseConfirm = async () => {
    if (!selectedPaymentId || !reverseReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการยกเลิก");
      return;
    }

    const paymentId = selectedPaymentId;
    const reason = reverseReason.trim();

    // OPTIMIZED: Optimistic update
    toast.success("ยกเลิกการโอนคืนสำเร็จ");
    setShowReverseDialog(false);
    setReverseReason("");
    setSelectedPaymentId(null);
    setIsReversing(false);
    onSuccess();

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
        onSuccess();
      }
    } catch (error) {
      toast.error("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง");
      onSuccess();
    }
  };

  const handleShowSlips = (urls: string[]) => {
    setSelectedSlipUrls(urls);
    setShowSlipDialog(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        ไม่มีรายการโอนคืน
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>วันที่โอน</TableHead>
              <TableHead>พนักงาน</TableHead>
              <TableHead className="text-center">รายการ</TableHead>
              <TableHead className="text-right">ยอดเงิน</TableHead>
              <TableHead>เลขอ้างอิง</TableHead>
              <TableHead className="text-center">สลิป</TableHead>
              <TableHead>ผู้ทำรายการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((round) => {
              const isExpanded = expandedRounds.has(round.roundKey);
              
              return (
                <>
                  {/* Main Row */}
                  <TableRow
                    key={round.roundKey}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(round.roundKey)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatDate(round.settledAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{round.payerSummary}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {round.payments.length} รายการ
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ฿{round.totalAmount.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      {round.settlementRef || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {round.settlementSlipUrls.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowSlips(round.settlementSlipUrls);
                          }}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          {round.settlementSlipUrls.length}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {round.settledBy?.name || "-"}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={8} className="p-0">
                        <div className="p-4 border-t">
                          <div className="text-sm font-medium mb-2">
                            รายการในรอบนี้
                          </div>
                          <div className="rounded-lg border bg-background divide-y">
                            {round.payments.map((payment) => {
                              const isDeleted = !!payment.Expense.deletedAt;
                              
                              return (
                                <div
                                  key={payment.id}
                                  className={`flex items-center justify-between p-3 ${
                                    isDeleted ? "bg-red-50 dark:bg-red-900/10" : ""
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {isDeleted ? (
                                        <span className="font-medium text-sm text-muted-foreground line-through flex items-center gap-1">
                                          <Trash2 className="h-3 w-3 text-red-500" />
                                          {payment.Expense.description ||
                                            "ไม่ระบุรายละเอียด"}
                                        </span>
                                      ) : (
                                        <Link
                                          href={`/${companyCode}/expenses/${payment.Expense.id}`}
                                          className="font-medium text-sm hover:underline truncate"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {payment.Expense.description ||
                                            "ไม่ระบุรายละเอียด"}
                                        </Link>
                                      )}
                                      {!isDeleted && (
                                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      )}
                                      {isDeleted && (
                                        <Badge
                                          variant="destructive"
                                          className="text-xs"
                                        >
                                          รายจ่ายถูกลบ
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span>
                                        {payment.PaidByUser?.name || "ไม่ระบุ"}
                                      </span>
                                      {payment.Expense.Contact && (
                                        <>
                                          <span>•</span>
                                          <span>{payment.Expense.Contact.name}</span>
                                        </>
                                      )}
                                      <span>•</span>
                                      <span>
                                        {formatShortDate(payment.Expense.billDate)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 ml-4">
                                    <span className="font-medium">
                                      ฿
                                      {Number(payment.amount).toLocaleString(
                                        "th-TH",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </span>
                                    {!isDeleted && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-orange-600 border-orange-300 hover:bg-orange-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReverseClick(payment.id);
                                        }}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

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

      {/* Slip Preview Dialog */}
      <Dialog open={showSlipDialog} onOpenChange={setShowSlipDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>สลิปการโอน</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedSlipUrls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={url}
                  alt={`สลิป ${index + 1}`}
                  className="w-full rounded-lg border"
                />
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
