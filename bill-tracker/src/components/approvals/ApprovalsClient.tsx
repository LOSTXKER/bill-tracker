"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserBadge } from "@/components/shared/UserBadge";
import { QuickApprovalCell } from "@/components/transactions/QuickApprovalCell";

interface ApprovalItem {
  id: string;
  description?: string | null;
  source?: string | null;
  billDate?: string | Date;
  receiveDate?: string | Date;
  netPaid?: number | bigint;
  netReceived?: number | bigint;
  submittedAt?: string | Date;
  submittedBy?: string | null;
  approvalStatus?: string | null;
  contact?: { name: string } | null;
  creator?: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  submittedByUser?: { id: string; name: string } | null;
  _type?: "expense" | "income";
}

interface ApprovalsClientProps {
  companyCode: string;
  expenses: ApprovalItem[];
  incomes: ApprovalItem[];
  expensesTotal: number;
  incomesTotal: number;
  currentUserId: string;
  activeType: "all" | "expense" | "income";
}

export function ApprovalsClient({
  companyCode,
  expenses,
  incomes,
  expensesTotal,
  incomesTotal,
  currentUserId,
  activeType,
}: ApprovalsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Combine items based on active type
  const items = useMemo(() => {
    if (activeType === "expense") return expenses;
    if (activeType === "income") return incomes;
    return [...expenses, ...incomes].sort((a, b) => {
      const dateA = new Date(a.submittedAt || 0).getTime();
      const dateB = new Date(b.submittedAt || 0).getTime();
      return dateA - dateB; // Oldest first
    });
  }, [expenses, incomes, activeType]);

  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    router.push(`/${companyCode}/approvals?${params.toString()}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const handleBatchApprove = async () => {
    setIsLoading(true);
    const toastId = toast.loading(`กำลังอนุมัติ ${selectedIds.length} รายการ...`);

    try {
      // Separate by type
      const expenseIds = items.filter(i => i._type === "expense" && selectedIds.includes(i.id)).map(i => i.id);
      const incomeIds = items.filter(i => i._type === "income" && selectedIds.includes(i.id)).map(i => i.id);

      const promises = [];
      if (expenseIds.length > 0) {
        promises.push(
          fetch("/api/expenses/batch/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: expenseIds }),
          })
        );
      }
      if (incomeIds.length > 0) {
        promises.push(
          fetch("/api/incomes/batch/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: incomeIds }),
          })
        );
      }

      await Promise.all(promises);
      toast.success(`อนุมัติ ${selectedIds.length} รายการสำเร็จ`, { id: toastId });
      setSelectedIds([]);
      setShowApproveConfirm(false);
      router.refresh();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(`กำลังปฏิเสธ ${selectedIds.length} รายการ...`);

    try {
      // Separate by type
      const expenseIds = items.filter(i => i._type === "expense" && selectedIds.includes(i.id)).map(i => i.id);
      const incomeIds = items.filter(i => i._type === "income" && selectedIds.includes(i.id)).map(i => i.id);

      const promises = [];
      if (expenseIds.length > 0) {
        promises.push(
          fetch("/api/expenses/batch/reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: expenseIds, reason: rejectReason.trim() }),
          })
        );
      }
      if (incomeIds.length > 0) {
        promises.push(
          fetch("/api/incomes/batch/reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: incomeIds, reason: rejectReason.trim() }),
          })
        );
      }

      await Promise.all(promises);
      toast.success(`ปฏิเสธ ${selectedIds.length} รายการสำเร็จ`, { id: toastId });
      setSelectedIds([]);
      setShowRejectConfirm(false);
      setRejectReason("");
      router.refresh();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการปฏิเสธ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (item: ApprovalItem) => {
    const basePath = item._type === "expense" ? "expenses" : "incomes";
    router.push(`/${companyCode}/${basePath}/${item.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={activeType} onValueChange={handleTypeChange}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              ทั้งหมด
              <Badge variant="secondary" className="ml-1">
                {expensesTotal + incomesTotal}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-2">
              <ArrowUpCircle className="h-4 w-4 text-destructive" />
              รายจ่าย
              <Badge variant="secondary" className="ml-1">
                {expensesTotal}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2">
              <ArrowDownCircle className="h-4 w-4 text-primary" />
              รายรับ
              <Badge variant="secondary" className="ml-1">
                {incomesTotal}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              เลือก {selectedIds.length} รายการ
            </span>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowApproveConfirm(true)}
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              อนุมัติทั้งหมด
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectConfirm(true)}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-1" />
              ปฏิเสธทั้งหมด
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">ไม่มีรายการรออนุมัติ</h3>
          <p className="text-sm text-muted-foreground">
            รายการทั้งหมดได้รับการจัดการแล้ว
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === items.length && items.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="เลือกทั้งหมด"
                  />
                </TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>ส่งเมื่อ</TableHead>
                <TableHead>ผู้ส่ง</TableHead>
                <TableHead>ผู้ติดต่อ</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead className="text-right">จำนวนเงิน</TableHead>
                <TableHead className="text-center">ดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isExpense = item._type === "expense";
                const amount = isExpense ? toNumber(item.netPaid) : toNumber(item.netReceived);
                const date = item.submittedAt ? new Date(item.submittedAt) : null;
                const submitterName = item.submittedByUser?.name || item.creator?.name || "ไม่ระบุ";

                const itemBasePath = item._type === "expense" ? "expenses" : "incomes";
                const rowHref = `/${companyCode}/${itemBasePath}/${item.id}`;

                return (
                  <Link
                    key={item.id}
                    href={rowHref}
                    onClick={() => handleRowClick(item)}
                    className="table-row cursor-pointer hover:bg-muted/50 transition-colors border-b"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label="เลือกรายการ"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1",
                          isExpense 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        {isExpense ? (
                          <ArrowUpCircle className="h-3 w-3" />
                        ) : (
                          <ArrowDownCircle className="h-3 w-3" />
                        )}
                        {isExpense ? "รายจ่าย" : "รายรับ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {date ? formatThaiDate(date) : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{submitterName}</span>
                    </TableCell>
                    <TableCell>
                      {item.contact?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-xs block">
                        {item.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      isExpense ? "text-destructive" : "text-primary"
                    )}>
                      {formatCurrency(amount)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <QuickApprovalCell
                        transactionId={item.id}
                        transactionType={item._type as "expense" | "income"}
                        approvalStatus={item.approvalStatus as any}
                        submittedBy={item.submittedBy}
                        currentUserId={currentUserId}
                        canApprove={true}
                        onSuccess={() => router.refresh()}
                      />
                    </TableCell>
                  </Link>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Batch Approve Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการอนุมัติ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการอนุมัติ {selectedIds.length} รายการที่เลือกใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchApprove}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังอนุมัติ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  อนุมัติ
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Reject Dialog */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการปฏิเสธ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>คุณต้องการปฏิเสธ {selectedIds.length} รายการที่เลือก กรุณาระบุเหตุผล</p>
                <Textarea
                  placeholder="ระบุเหตุผลในการปฏิเสธ..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchReject}
              disabled={isLoading || !rejectReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังปฏิเสธ...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  ปฏิเสธ
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
