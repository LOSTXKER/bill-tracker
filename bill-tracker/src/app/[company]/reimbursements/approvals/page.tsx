"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Receipt,
} from "lucide-react";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { UserBadge } from "@/components/shared/UserBadge";

interface Reimbursement {
  id: string;
  description: string;
  netPaid: number;
  billDate: string;
  reimbursementStatus: string;
  createdAt: string;
  fraudScore: number | null;
  fraudFlags: any[] | null;
  requester: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  categoryRef: {
    name: string;
    color: string | null;
  } | null;
  slipUrls: string[];
}

export default function ApprovalsPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  // Fetch pending reimbursements
  const fetchReimbursements = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/reimbursement-requests?companyId=${companyId}&status=PENDING`
      );
      const result = await response.json();
      
      const flaggedResponse = await fetch(
        `/api/reimbursement-requests?companyId=${companyId}&status=FLAGGED`
      );
      const flaggedResult = await flaggedResponse.json();
      
      const mapRequest = (req: any) => ({
        id: req.id,
        description: req.description,
        netPaid: req.netAmount,
        billDate: req.billDate,
        reimbursementStatus: req.status,
        createdAt: req.createdAt,
        fraudScore: req.fraudScore,
        fraudFlags: req.fraudFlags,
        requester: req.requester,
        categoryRef: req.categoryRef,
        slipUrls: req.receiptUrls || [],
      });
      
      setReimbursements([
        ...(flaggedResult.data?.requests || []).map(mapRequest),
        ...(result.data?.requests || []).map(mapRequest),
      ]);
    } catch (error) {
      console.error("Error fetching reimbursements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements();
  }, [companyId]);

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(id);
    try {
      const response = await fetch(`/api/reimbursement-requests/${id}/approve`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      toast.success("อนุมัติเบิกจ่ายแล้ว");
      fetchReimbursements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRejectingId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }

    setProcessingId(rejectingId);
    try {
      const response = await fetch(`/api/reimbursement-requests/${rejectingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      toast.success("ปฏิเสธเบิกจ่ายแล้ว");
      setRejectDialogOpen(false);
      fetchReimbursements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setProcessingId(null);
      setRejectingId(null);
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/${companyCode.toLowerCase()}/reimbursements/${id}`);
  };

  const getFraudScoreColor = (score: number | null) => {
    if (score === null) return "";
    if (score < 30) return "text-emerald-600";
    if (score < 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="รออนุมัติเบิกจ่าย"
        description="ตรวจสอบและอนุมัติคำขอเบิกจ่ายจากพนักงาน"
        actions={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            รออนุมัติ {reimbursements.filter(r => r.reimbursementStatus === 'PENDING').length} รายการ
          </span>
        </div>
        {reimbursements.filter(r => r.reimbursementStatus === 'FLAGGED').length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="font-medium text-red-700 dark:text-red-400">
              พบปัญหา {reimbursements.filter(r => r.reimbursementStatus === 'FLAGGED').length} รายการ
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">รายการรออนุมัติ</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : reimbursements.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ไม่มีรายการรออนุมัติ</h3>
              <p className="text-muted-foreground">
                ทุกรายการได้รับการดำเนินการเรียบร้อยแล้ว
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[100px]">วันที่</TableHead>
                    <TableHead className="w-[150px]">ผู้ขอ</TableHead>
                    <TableHead className="w-[120px]">หมวดหมู่</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="w-[80px] text-center">Risk</TableHead>
                    <TableHead className="w-[120px] text-right">จำนวนเงิน</TableHead>
                    <TableHead className="w-[200px] text-center">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map((item) => {
                    const isProcessing = processingId === item.id;
                    const isFlagged = item.reimbursementStatus === "FLAGGED";
                    
                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer transition-colors ${
                          isFlagged ? "bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50" : "hover:bg-muted/30"
                        }`}
                        onClick={() => handleRowClick(item.id)}
                      >
                        <TableCell className="whitespace-nowrap text-foreground">
                          {formatThaiDate(new Date(item.billDate))}
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
                          <div className="flex items-center gap-2">
                            {item.description ? (
                              <p className="text-sm text-foreground truncate max-w-xs">
                                {item.description}
                              </p>
                            ) : (
                              <span className="text-xs text-muted-foreground">ไม่ระบุ</span>
                            )}
                            {isFlagged && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 shrink-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                AI พบปัญหา
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.fraudScore !== null ? (
                            <div className={`flex items-center justify-center gap-1 text-sm font-medium ${getFraudScoreColor(item.fraudScore)}`}>
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {item.fraudScore}%
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(toNumber(item.netPaid))}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={(e) => openRejectDialog(item.id, e)}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              ปฏิเสธ
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700"
                              onClick={(e) => handleApprove(item.id, e)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              )}
                              อนุมัติ
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอเบิกจ่าย</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลในการปฏิเสธเพื่อแจ้งให้พนักงานทราบ
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">เหตุผล</Label>
            <Textarea
              id="reason"
              placeholder="เช่น ใบเสร็จไม่ชัดเจน, รายการไม่เกี่ยวข้องกับงาน, ยอดเงินไม่ตรง"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processingId !== null}
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              ยืนยันปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
