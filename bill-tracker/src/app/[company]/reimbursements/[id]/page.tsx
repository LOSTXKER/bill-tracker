"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  ShieldAlert,
  Receipt,
  Calendar,
  Tag,
  FileText,
  User,
  Ban,
  CreditCard,
  ExternalLink,
  Download,
  Image as ImageIcon,
} from "lucide-react";

interface ReimbursementDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

interface Reimbursement {
  id: string;
  description: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  netPaid: number;
  billDate: string;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  status: string;
  reimbursementStatus: string;
  fraudScore: number | null;
  fraudFlags: any[];
  createdAt: string;
  reimbursementRejectedReason: string | null;
  reimbursementApprovedAt: string | null;
  reimbursementPaidAt: string | null;
  slipUrls: string[];
  requester: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  reimbursementApprover: {
    id: string;
    name: string;
  } | null;
  reimbursementPayer: {
    id: string;
    name: string;
  } | null;
  categoryRef: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  contact: {
    id: string;
    name: string;
  } | null;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "รออนุมัติ",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: Clock,
  },
  FLAGGED: {
    label: "AI พบปัญหา",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: AlertTriangle,
  },
  APPROVED: {
    label: "อนุมัติแล้ว - รอจ่ายเงิน",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Wallet,
  },
  REJECTED: {
    label: "ถูกปฏิเสธ",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายเงินแล้ว",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle2,
  },
};

export default function ReimbursementDetailPage({
  params,
}: ReimbursementDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const router = useRouter();
  const [reimbursement, setReimbursement] = useState<Reimbursement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchReimbursement = async () => {
      try {
        // Try new API first
        const res = await fetch(`/api/reimbursement-requests/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.request) {
            // Map from new model to old UI format
            setReimbursement({
              id: data.request.id,
              description: data.request.description,
              amount: data.request.amount,
              vatRate: data.request.vatRate,
              vatAmount: data.request.vatAmount,
              netPaid: data.request.netAmount,
              billDate: data.request.billDate,
              paymentMethod: data.request.paymentMethod,
              invoiceNumber: data.request.invoiceNumber,
              status: data.request.linkedExpense?.status || "PENDING_PHYSICAL",
              reimbursementStatus: data.request.status,
              fraudScore: data.request.fraudScore,
              fraudFlags: data.request.fraudFlags || [],
              createdAt: data.request.createdAt,
              reimbursementRejectedReason: data.request.rejectedReason,
              reimbursementApprovedAt: data.request.approvedAt,
              reimbursementPaidAt: data.request.paidAt,
              slipUrls: data.request.receiptUrls || [],
              requester: data.request.requester,
              reimbursementApprover: data.request.approver,
              reimbursementPayer: data.request.payer,
              categoryRef: data.request.categoryRef,
              contact: data.request.contact,
            });
            return;
          }
        }
        
        // Fallback to old API (for old data)
        const oldRes = await fetch(`/api/expenses/${id}`);
        if (!oldRes.ok) {
          throw new Error("ไม่พบข้อมูล");
        }
        const oldData = await oldRes.json();
        if (!oldData.expense) {
          throw new Error("ไม่พบข้อมูล");
        }
        setReimbursement(oldData.expense);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReimbursement();
  }, [id, companyCode, router]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reimbursement-requests/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถอนุมัติได้");
      toast.success("อนุมัติสำเร็จ");
      // Map response to UI format
      if (data.request) {
        setReimbursement((prev) => prev ? {
          ...prev,
          reimbursementStatus: data.request.status,
          reimbursementApprovedAt: data.request.approvedAt,
          reimbursementApprover: data.request.approver,
        } : null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reimbursement-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถปฏิเสธได้");
      toast.success("ปฏิเสธสำเร็จ");
      // Map response to UI format
      if (data.request) {
        setReimbursement((prev) => prev ? {
          ...prev,
          reimbursementStatus: data.request.status,
          reimbursementRejectedReason: data.request.rejectedReason,
          reimbursementApprovedAt: data.request.approvedAt,
          reimbursementApprover: data.request.approver,
        } : null);
      }
      setShowRejectDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reimbursement-requests/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถบันทึกการจ่ายได้");
      toast.success("บันทึกการจ่ายเงินสำเร็จ - รายจ่ายถูกสร้างในระบบ");
      // Map response to UI format
      if (data.request) {
        setReimbursement((prev) => prev ? {
          ...prev,
          reimbursementStatus: data.request.status,
          reimbursementPaidAt: data.request.paidAt,
          reimbursementPayer: data.request.payer,
        } : null);
      }
      setShowPayDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !reimbursement) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">ไม่พบข้อมูล</h3>
        <p className="text-muted-foreground mb-6">{error || "ไม่พบรายการเบิกจ่าย"}</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>
      </div>
    );
  }

  const status = statusConfig[reimbursement.reimbursementStatus] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  const netPaid = toNumber(reimbursement.netPaid);
  const amount = toNumber(reimbursement.amount);
  const vatAmount = reimbursement.vatAmount ? toNumber(reimbursement.vatAmount) : 0;

  const canApprove =
    reimbursement.reimbursementStatus === "PENDING" ||
    reimbursement.reimbursementStatus === "FLAGGED";
  const canPay = reimbursement.reimbursementStatus === "APPROVED";
  const isRejected = reimbursement.reimbursementStatus === "REJECTED";
  const isPaid = reimbursement.reimbursementStatus === "PAID";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${companyCode.toLowerCase()}/reimbursements`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">คำขอเบิกจ่าย</h1>
              <Badge className={`${status.bgColor} ${status.color} border-0 gap-1`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {formatThaiDate(new Date(reimbursement.billDate))}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canApprove && (
            <>
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowRejectDialog(true)}
                disabled={isSubmitting}
              >
                <Ban className="mr-2 h-4 w-4" />
                ปฏิเสธ
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                อนุมัติ
              </Button>
            </>
          )}
          {canPay && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowPayDialog(true)}
              disabled={isSubmitting}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              จ่ายเงินคืน
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Alert */}
      {isRejected && reimbursement.reimbursementRejectedReason && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  คำขอถูกปฏิเสธ
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  เหตุผล: {reimbursement.reimbursementRejectedReason}
                </p>
                {reimbursement.reimbursementApprover && (
                  <p className="text-xs text-red-500 mt-2">
                    โดย {reimbursement.reimbursementApprover.name} •{" "}
                    {formatThaiDate(new Date(reimbursement.reimbursementApprovedAt!))}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fraud Alert */}
      {reimbursement.fraudScore !== null && reimbursement.fraudScore >= 30 && (
        <Card
          className={`border-2 ${
            reimbursement.fraudScore >= 60
              ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
              : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert
                className={`h-5 w-5 mt-0.5 ${
                  reimbursement.fraudScore >= 60 ? "text-red-600" : "text-amber-600"
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      reimbursement.fraudScore >= 60
                        ? "text-red-700 dark:text-red-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    AI ตรวจพบความเสี่ยง: {reimbursement.fraudScore}%
                  </p>
                </div>
                {reimbursement.fraudFlags && reimbursement.fraudFlags.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {reimbursement.fraudFlags.map((flag: any, i: number) => (
                      <li
                        key={i}
                        className={`text-sm ${
                          reimbursement.fraudScore! >= 60
                            ? "text-red-600 dark:text-red-300"
                            : "text-amber-600 dark:text-amber-300"
                        }`}
                      >
                        • {flag.reason || flag.message || JSON.stringify(flag)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              รายละเอียดคำขอ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Requester */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <Avatar className="h-12 w-12">
                <AvatarImage src={reimbursement.requester?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {reimbursement.requester?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">ผู้ขอเบิก</p>
                <p className="font-medium">{reimbursement.requester?.name || "-"}</p>
                <p className="text-sm text-muted-foreground">
                  {reimbursement.requester?.email}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  รายละเอียด
                </p>
                <p className="font-medium">{reimbursement.description || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-4 w-4" />
                  หมวดหมู่
                </p>
                <p className="font-medium">{reimbursement.categoryRef?.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  วันที่จ่ายเงิน
                </p>
                <p className="font-medium">
                  {formatThaiDate(new Date(reimbursement.billDate))}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  ผู้ติดต่อ / ร้านค้า
                </p>
                <p className="font-medium">{reimbursement.contact?.name || "-"}</p>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดก่อน VAT</span>
                <span>{formatCurrency(amount)}</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    VAT ({reimbursement.vatRate}%)
                  </span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>ยอดเบิก</span>
                <span className="text-blue-600">{formatCurrency(netPaid)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt & Timeline */}
        <div className="space-y-6">
          {/* Receipts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-5 w-5" />
                หลักฐานการจ่ายเงิน
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reimbursement.slipUrls && reimbursement.slipUrls.length > 0 ? (
                <div className="space-y-3">
                  {reimbursement.slipUrls.map((url, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          ไฟล์ {i + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <a href={url} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ไม่มีไฟล์แนบ
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ประวัติการดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Created */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-primary/10">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">ส่งคำขอ</p>
                    <p className="text-xs text-muted-foreground">
                      {formatThaiDate(new Date(reimbursement.createdAt))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      โดย {reimbursement.requester?.name}
                    </p>
                  </div>
                </div>

                {/* Approved/Rejected */}
                {reimbursement.reimbursementApprovedAt && (
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-full ${
                        isRejected ? "bg-red-100" : "bg-emerald-100"
                      }`}
                    >
                      {isRejected ? (
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isRejected ? "ถูกปฏิเสธ" : "อนุมัติแล้ว"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatThaiDate(new Date(reimbursement.reimbursementApprovedAt))}
                      </p>
                      {reimbursement.reimbursementApprover && (
                        <p className="text-xs text-muted-foreground">
                          โดย {reimbursement.reimbursementApprover.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Paid */}
                {reimbursement.reimbursementPaidAt && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-blue-100">
                      <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">จ่ายเงินแล้ว</p>
                      <p className="text-xs text-muted-foreground">
                        {formatThaiDate(new Date(reimbursement.reimbursementPaidAt))}
                      </p>
                      {reimbursement.reimbursementPayer && (
                        <p className="text-xs text-muted-foreground">
                          โดย {reimbursement.reimbursementPayer.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอเบิกจ่าย</DialogTitle>
            <DialogDescription>กรุณาระบุเหตุผลในการปฏิเสธ</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เหตุผลในการปฏิเสธ..."
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
            >
              {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการจ่ายเงินคืน</DialogTitle>
            <DialogDescription>
              ยอดเงิน: {formatCurrency(netPaid)} ให้ {reimbursement.requester?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>เลขอ้างอิง / หมายเหตุ (ถ้ามี)</Label>
              <Input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="เช่น เลขที่โอน, วันที่จ่าย"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayDialog(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePay}
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยันจ่ายเงิน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
