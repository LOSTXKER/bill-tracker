"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ArrowLeft,
  Wallet,
  Loader2,
  CreditCard,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { UserBadge } from "@/components/shared/UserBadge";

interface ReimbursementItem {
  id: string;
  description: string;
  netPaid: number;
  billDate: string;
  categoryRef: {
    name: string;
  } | null;
  requester?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  reimbursementApprovedAt: string;
  slipUrls: string[];
}

interface Summary {
  pendingApproval: { count: number; amount: number };
  flagged: { count: number; amount: number };
  pendingPayment: { count: number; amount: number };
  paid: { count: number; amount: number };
  rejected: { count: number; amount: number };
}

export default function PayoutsPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [pendingItems, setPendingItems] = useState<ReimbursementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Pay dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  // Fetch company ID
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?code=${companyCode}`);
        const result = await response.json();
        if (result.data?.companies?.[0]) {
          setCompanyId(result.data.companies[0].id);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyCode]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const summaryRes = await fetch(
        `/api/reimbursement-requests/summary?companyId=${companyId}`
      );
      const summaryResult = await summaryRes.json();
      setSummary(summaryResult.data?.summary);
      
      const itemsRes = await fetch(
        `/api/reimbursement-requests?companyId=${companyId}&status=APPROVED`
      );
      const itemsResult = await itemsRes.json();
      
      const items = (itemsResult.data?.requests || []).map((req: any) => ({
        id: req.id,
        description: req.description,
        netPaid: req.netAmount,
        billDate: req.billDate,
        categoryRef: req.categoryRef,
        requester: req.requester,
        reimbursementApprovedAt: req.approvedAt,
        slipUrls: req.receiptUrls || [],
      }));
      setPendingItems(items);
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Real-time update: Refetch when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchSummary();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSummary]);

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map(item => item.id)));
    }
  };

  const getSelectedTotal = () => {
    return pendingItems
      .filter((item) => selectedItems.has(item.id))
      .reduce((sum, item) => sum + toNumber(item.netPaid), 0);
  };

  const handlePaySelected = async () => {
    if (selectedItems.size === 0) {
      toast.error("กรุณาเลือกรายการที่ต้องการจ่าย");
      return;
    }

    const newProcessing = new Set(processingIds);
    selectedItems.forEach((id) => newProcessing.add(id));
    setProcessingIds(newProcessing);

    try {
      const promises = Array.from(selectedItems).map((id) =>
        fetch(`/api/reimbursement-requests/${id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentRef,
            paymentMethod,
          }),
        })
      );

      const results = await Promise.allSettled(promises);
      
      const successCount = results.filter(r => r.status === "fulfilled").length;
      const failCount = results.filter(r => r.status === "rejected").length;

      if (successCount > 0) {
        toast.success(`จ่ายเงินสำเร็จ ${successCount} รายการ`);
      }
      if (failCount > 0) {
        toast.error(`จ่ายเงินไม่สำเร็จ ${failCount} รายการ`);
      }

      setPayDialogOpen(false);
      setSelectedItems(new Set());
      setPaymentRef("");
      fetchSummary();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/${companyCode.toLowerCase()}/reimbursements/${id}`);
  };

  const formatDate = (dateStr: string) => {
    return formatThaiDate(new Date(dateStr));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="จ่ายเงินคืนพนักงาน"
        description="บันทึกการจ่ายเงินคืนสำหรับคำขอที่อนุมัติแล้ว"
        actions={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
        }
      />

      {/* Stats */}
      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">รอจ่ายเงิน</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {summary.pendingPayment.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.pendingPayment.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">จ่ายแล้ว</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {summary.paid.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.paid.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ยอดรวมค้างจ่าย</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(summary.pendingPayment.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">รายการรอจ่ายเงิน</CardTitle>
              <CardDescription>
                {selectedItems.size > 0 ? (
                  <span className="text-primary font-medium">
                    เลือก {selectedItems.size} รายการ · รวม {formatCurrency(getSelectedTotal())}
                  </span>
                ) : (
                  "เลือกรายการและจ่ายเงินพร้อมกัน"
                )}
              </CardDescription>
            </div>
            {selectedItems.size > 0 && (
              <Button
                onClick={() => setPayDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                จ่ายเงิน ({selectedItems.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ไม่มีรายการรอจ่ายเงิน</h3>
              <p className="text-muted-foreground">
                ทุกรายการได้รับการจ่ายเงินเรียบร้อยแล้ว
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="เลือกทั้งหมด"
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">วันที่</TableHead>
                    <TableHead className="w-[150px]">ผู้ขอ</TableHead>
                    <TableHead className="w-[120px]">หมวดหมู่</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="w-[120px] text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleRowClick(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          aria-label={`เลือกรายการ`}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground">
                        {formatDate(item.billDate)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {item.requester ? (
                          <UserBadge user={item.requester} />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.categoryRef?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {item.description ? (
                          <p className="text-sm text-foreground truncate max-w-xs">
                            {item.description}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">ไม่ระบุ</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {formatCurrency(toNumber(item.netPaid))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการจ่ายเงินคืน</DialogTitle>
            <DialogDescription>
              จ่ายเงิน {selectedItems.size} รายการ · รวม {formatCurrency(getSelectedTotal())}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>วิธีการจ่าย</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">🏦 โอนเงิน</SelectItem>
                  <SelectItem value="CASH">💵 เงินสด</SelectItem>
                  <SelectItem value="PROMPTPAY">📱 พร้อมเพย์</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              onClick={() => setPayDialogOpen(false)}
              disabled={processingIds.size > 0}
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePaySelected}
              disabled={processingIds.size > 0}
            >
              {processingIds.size > 0 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  ยืนยันจ่ายเงิน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
