"use client";

import { Fragment, memo, useState } from "react";
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
  Inbox,
  Undo2,
  Trash2,
  User,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { formatThaiDateTime } from "@/lib/utils/formatters";

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

export interface SettlementRound {
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

function SettlementRoundsTableInner({
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

    setIsReversing(true);
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
        return;
      }

      toast.success("ยกเลิกการโอนคืนสำเร็จ");
      setShowReverseDialog(false);
      setReverseReason("");
      setSelectedPaymentId(null);
      onSuccess();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsReversing(false);
    }
  };

  const handleShowSlips = (urls: string[]) => {
    setSelectedSlipUrls(urls);
    setShowSlipDialog(true);
  };

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">ไม่มีรายการโอนคืน</p>
        <p className="text-sm mt-1">รายการที่โอนคืนแล้วจะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border/50 shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>วันที่โอน</TableHead>
              <TableHead>พนักงาน</TableHead>
              <TableHead className="text-center">รายการ</TableHead>
              <TableHead className="text-right">ยอดเงิน</TableHead>
              <TableHead className="text-center">สลิป</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((round) => {
              const isExpanded = expandedRounds.has(round.roundKey);

              return (
                <Fragment key={round.roundKey}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(round.roundKey)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium text-sm whitespace-nowrap">
                      {formatThaiDateTime(round.settledAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{round.payerSummary}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {round.payments.length} รายการ
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-primary">
                      {formatCurrency(round.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {round.settlementSlipUrls.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowSlips(round.settlementSlipUrls);
                          }}
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          {round.settlementSlipUrls.length}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="p-0">
                        <div className="px-4 py-3 border-t">
                          {/* Round meta info */}
                          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                            {round.settledBy && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                ผู้ทำรายการ: {round.settledBy.name}
                              </span>
                            )}
                            {round.settlementRef && (
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                อ้างอิง: {round.settlementRef}
                              </span>
                            )}
                          </div>
                          <div className="rounded-lg border bg-background divide-y">
                            {round.payments.map((payment) => {
                              const isDeleted = !!payment.Expense.deletedAt;

                              return (
                                <div
                                  key={payment.id}
                                  className={`flex items-center justify-between p-3 ${
                                    isDeleted ? "bg-destructive/5" : ""
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {isDeleted ? (
                                        <span className="font-medium text-sm text-muted-foreground line-through flex items-center gap-1">
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                          {payment.Expense.description || "ไม่ระบุรายละเอียด"}
                                        </span>
                                      ) : (
                                        <Link
                                          href={`/${companyCode}/expenses/${payment.Expense.id}`}
                                          className="font-medium text-sm hover:underline truncate"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {payment.Expense.description || "ไม่ระบุรายละเอียด"}
                                        </Link>
                                      )}
                                      {!isDeleted && (
                                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                      )}
                                      {isDeleted && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                          ถูกลบ
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                      <span>{payment.PaidByUser?.name || "ไม่ระบุ"}</span>
                                      {payment.Expense.Contact && (
                                        <>
                                          <span>·</span>
                                          <span>{payment.Expense.Contact.name}</span>
                                        </>
                                      )}
                                      <span>·</span>
                                      <span>{formatThaiDate(new Date(payment.Expense.billDate))}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 ml-4">
                                    <span className="font-medium text-sm tabular-nums">
                                      {formatCurrency(Number(payment.amount))}
                                    </span>
                                    {!isDeleted && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
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
                </Fragment>
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

export const SettlementRoundsTable = memo(SettlementRoundsTableInner);
