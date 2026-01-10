"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  User,
  Wallet,
  Receipt,
  FileText,
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Download,
  Building2,
  Hash,
  Banknote,
  Plus,
} from "lucide-react";
import type { Reimbursement } from "@/types/reimbursement";
import { getStatusConfig, getFraudScoreColor } from "@/types/reimbursement";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { ReimbursementActions } from "./ReimbursementActions";

interface ReimbursementSheetProps {
  reimbursementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (id: string) => Promise<boolean>;
  onReject?: (id: string, reason: string) => Promise<boolean>;
  onPay?: (id: string, paymentRef: string, paymentMethod: string) => Promise<boolean>;
  companyCode?: string;
}

export function ReimbursementSheet({
  reimbursementId,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onPay,
  companyCode,
}: ReimbursementSheetProps) {
  const router = useRouter();
  const [reimbursement, setReimbursement] = useState<Reimbursement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigate to create expense from this reimbursement
  const navigateToCreateExpense = (r: Reimbursement) => {
    if (!companyCode) return;
    
    // Store reimbursement data in sessionStorage for the capture page
    const expenseData = {
      fromReimbursement: r.id,
      amount: r.amount,
      vatRate: r.vatRate || 0,
      description: r.description ? `[เบิกจ่าย] ${r.description}` : `[เบิกจ่าย] โดย ${r.requester?.name || "ไม่ระบุ"}`,
      invoiceNumber: r.invoiceNumber,
      paymentMethod: r.paymentMethod,
      billDate: r.billDate,
      contactId: r.contact?.id,
      // Pass receipt URLs as slipUrls for expense
      slipUrls: r.receiptUrls || [],
    };
    
    console.log("Saving prefill data to sessionStorage:", expenseData);
    sessionStorage.setItem("prefillExpenseData", JSON.stringify(expenseData));
    
    // Verify it was saved
    const saved = sessionStorage.getItem("prefillExpenseData");
    console.log("Verified saved data:", saved);
    
    // Navigate first, then close the sheet
    const url = `/${companyCode.toLowerCase()}/capture?type=expense&fromReimbursement=${r.id}`;
    router.push(url);
    
    // Close sheet after a short delay to ensure navigation starts
    setTimeout(() => {
      onOpenChange(false);
    }, 100);
  };

  useEffect(() => {
    if (!reimbursementId || !open) {
      setReimbursement(null);
      return;
    }

    const fetchReimbursement = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/reimbursement-requests/${reimbursementId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "ไม่พบข้อมูล");
        }

        // API returns { success: true, data: { request: {...} } }
        const requestData = data.data?.request || data.request;
        if (requestData) {
          // Map to typed reimbursement
          const req = requestData;
          setReimbursement({
            id: req.id,
            description: req.description,
            amount: req.amount,
            vatRate: req.vatRate,
            vatAmount: req.vatAmount,
            netAmount: req.netAmount,
            billDate: req.billDate,
            paymentMethod: req.paymentMethod,
            invoiceNumber: req.invoiceNumber,
            status: req.status,
            fraudScore: req.fraudScore,
            fraudFlags: req.fraudFlags || [],
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            requester: req.requesterName
              ? {
                  id: null,
                  name: req.requesterName,
                  email: req.requesterEmail || null,
                  avatarUrl: null,
                }
              : null,
            bankInfo: req.bankName
              ? {
                  bankName: req.bankName,
                  bankAccountNo: req.bankAccountNo,
                  bankAccountName: req.bankAccountName,
                }
              : undefined,
            trackingCode: req.trackingCode,
            account: null, // ReimbursementRequest doesn't have account field
            contact: req.contact,
            rejectedReason: req.rejectedReason,
            rejectedAt: null, // Schema doesn't track rejection date
            rejectedBy: null, // Schema doesn't track who rejected
            approvedAt: req.approvedAt,
            approvedBy: req.approver,
            paidAt: req.paidAt,
            paidBy: req.payer,
            paymentRef: req.paymentRef,
            receiptUrls: req.receiptUrls || [],
            linkedExpense: req.linkedExpense || null,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReimbursement();
  }, [reimbursementId, open]);

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <>
                <SheetHeader>
                  <SheetTitle>กำลังโหลด...</SheetTitle>
                  <SheetDescription>กำลังโหลดข้อมูลคำขอเบิกจ่าย</SheetDescription>
                </SheetHeader>
                <SheetLoadingSkeleton />
              </>
            ) : error ? (
              <>
                <SheetHeader>
                  <SheetTitle>เกิดข้อผิดพลาด</SheetTitle>
                  <SheetDescription>{error}</SheetDescription>
                </SheetHeader>
                <SheetErrorState error={error} />
              </>
            ) : !reimbursement ? (
              <>
                <SheetHeader>
                  <SheetTitle>ไม่พบข้อมูล</SheetTitle>
                  <SheetDescription>ไม่พบคำขอเบิกจ่ายนี้ในระบบ</SheetDescription>
                </SheetHeader>
              </>
            ) : (
              <>
                <SheetHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <SheetTitle>รายละเอียดคำขอเบิกจ่าย</SheetTitle>
                      <SheetDescription>
                        สร้างเมื่อ {formatThaiDate(new Date(reimbursement.createdAt))}
                      </SheetDescription>
                    </div>
                    <Badge
                      variant={getStatusConfig(reimbursement.status).badgeVariant}
                      className="shrink-0"
                    >
                      {getStatusConfig(reimbursement.status).label}
                    </Badge>
                  </div>
                </SheetHeader>

                {/* Amount Card */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-6">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">จำนวนเงิน</p>
                      <p className="text-4xl font-bold text-primary">
                        {formatCurrency(reimbursement.netAmount)}
                      </p>
                      {reimbursement.vatAmount && reimbursement.vatAmount > 0 && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>ยอดก่อน VAT: {formatCurrency(reimbursement.amount)}</div>
                          <div>
                            VAT {reimbursement.vatRate}%: {formatCurrency(reimbursement.vatAmount)}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Fraud Score Warning */}
                {reimbursement.fraudScore !== null && reimbursement.fraudScore >= 60 && (
                  <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="font-semibold text-red-700 dark:text-red-400">
                            AI ตรวจพบความเสี่ยงสูง ({reimbursement.fraudScore}%)
                          </p>
                          {reimbursement.fraudFlags.length > 0 && (
                            <ul className="text-sm space-y-1 text-red-600 dark:text-red-400">
                              {reimbursement.fraudFlags.map((flag, idx) => (
                                <li key={idx}>• {flag.message}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tracking Code */}
                {reimbursement.trackingCode && (
                  <InfoRow
                    icon={Hash}
                    label="รหัสติดตาม"
                    value={
                      <code className="px-2 py-1 rounded bg-muted font-mono text-sm">
                        {reimbursement.trackingCode}
                      </code>
                    }
                  />
                )}

                <Separator />

                {/* Request Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ข้อมูลคำขอ
                  </h3>

                  <div className="space-y-3">
                    <InfoRow
                      icon={Calendar}
                      label="วันที่จ่ายเงิน"
                      value={formatThaiDate(new Date(reimbursement.billDate))}
                    />

                    {reimbursement.description && (
                      <InfoRow icon={Receipt} label="รายละเอียด" value={reimbursement.description} />
                    )}

                    {reimbursement.invoiceNumber && (
                      <InfoRow icon={FileText} label="เลขที่ใบเสร็จ" value={reimbursement.invoiceNumber} />
                    )}

                    {reimbursement.account && (
                      <InfoRow
                        icon={Wallet}
                        label="บัญชี"
                        value={`${reimbursement.account.code} - ${reimbursement.account.name}`}
                      />
                    )}

                    {reimbursement.contact && (
                      <InfoRow
                        icon={Building2}
                        label="ผู้ติดต่อ/ร้านค้า"
                        value={reimbursement.contact.name}
                      />
                    )}

                    {reimbursement.fraudScore !== null && (
                      <InfoRow
                        icon={ShieldAlert}
                        label="คะแนนความเสี่ยง"
                        value={
                          <span className={`font-semibold ${getFraudScoreColor(reimbursement.fraudScore)}`}>
                            {reimbursement.fraudScore}%
                          </span>
                        }
                      />
                    )}
                  </div>
                </div>

                <Separator />

                {/* Requester Info */}
                {reimbursement.requester && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ผู้ขอเบิก
                    </h3>

                    <div className="space-y-3">
                      <InfoRow icon={User} label="ชื่อ" value={reimbursement.requester.name} />

                      {reimbursement.requester.email && (
                        <InfoRow icon={null} label="อีเมล" value={reimbursement.requester.email} />
                      )}
                    </div>
                  </div>
                )}

                {/* Bank Info */}
                {reimbursement.bankInfo && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        ข้อมูลบัญชีธนาคาร
                      </h3>

                      <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">ธนาคาร</span>
                            <span className="font-medium">{reimbursement.bankInfo.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">เลขบัญชี</span>
                            <span className="font-mono">{reimbursement.bankInfo.bankAccountNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">ชื่อบัญชี</span>
                            <span className="font-medium">
                              {reimbursement.bankInfo.bankAccountName}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Receipt Images */}
                {reimbursement.receiptUrls.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        ใบเสร็จ ({reimbursement.receiptUrls.length})
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        {reimbursement.receiptUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-video rounded-lg overflow-hidden border hover:border-primary transition-colors"
                          >
                            <Image
                              src={url}
                              alt={`ใบเสร็จ ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Timeline */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </h3>

                  <div className="space-y-3">
                    <TimelineItem
                      icon={Receipt}
                      label="สร้างคำขอ"
                      date={reimbursement.createdAt}
                      user={reimbursement.requester?.name}
                    />

                    {reimbursement.approvedAt && (
                      <TimelineItem
                        icon={CheckCircle2}
                        label="อนุมัติ"
                        date={reimbursement.approvedAt}
                        user={reimbursement.approvedBy?.name}
                        color="text-emerald-600"
                      />
                    )}

                    {reimbursement.rejectedAt && (
                      <TimelineItem
                        icon={XCircle}
                        label="ปฏิเสธ"
                        date={reimbursement.rejectedAt}
                        user={reimbursement.rejectedBy?.name}
                        color="text-red-600"
                        note={reimbursement.rejectedReason}
                      />
                    )}

                    {reimbursement.paidAt && (
                      <TimelineItem
                        icon={Banknote}
                        label="จ่ายเงิน"
                        date={reimbursement.paidAt}
                        user={reimbursement.paidBy?.name}
                        color="text-blue-600"
                        note={reimbursement.paymentRef}
                      />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <Separator />
                <ReimbursementActions
                  reimbursement={reimbursement}
                  onApprove={onApprove}
                  onReject={onReject}
                  onPay={onPay}
                  onClose={() => onOpenChange(false)}
                />

                {/* CTA: Create Expense from Reimbursement */}
                {reimbursement.status === "PAID" && !reimbursement.linkedExpense && companyCode && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        คำขอเบิกจ่ายนี้ได้รับการจ่ายเงินแล้ว แต่ยังไม่ได้สร้างรายจ่ายในระบบ
                      </p>
                      <Button
                        onClick={() => navigateToCreateExpense(reimbursement)}
                        className="w-full bg-destructive hover:bg-destructive/90"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        สร้างรายจ่าย
                      </Button>
                    </div>
                  </>
                )}

                {/* Show linked expense if exists */}
                {reimbursement.linkedExpense && companyCode && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>รายจ่ายถูกสร้างในระบบแล้ว</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/${companyCode.toLowerCase()}/expenses/${reimbursement.linkedExpense!.id}`);
                        }}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        ดูรายจ่ายที่สร้าง
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="flex-1 grid grid-cols-2 gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  date,
  user,
  color = "text-muted-foreground",
  note,
}: {
  icon: any;
  label: string;
  date: string;
  user?: string;
  color?: string;
  note?: string | null;
}) {
  return (
    <div className="flex gap-3">
      <div className={`${color} pt-0.5`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{label}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatThaiDate(new Date(date))}
          </span>
        </div>
        {user && <p className="text-sm text-muted-foreground">{user}</p>}
        {note && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 mt-1">{note}</p>
        )}
      </div>
    </div>
  );
}

function SheetLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function SheetErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">เกิดข้อผิดพลาด</h3>
      <p className="text-muted-foreground">{error}</p>
    </div>
  );
}
