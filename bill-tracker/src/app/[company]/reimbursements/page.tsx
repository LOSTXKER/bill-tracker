"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReimbursementTableRow } from "@/components/reimbursements/reimbursement-table-row";
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  Receipt,
} from "lucide-react";

interface Reimbursement {
  id: string;
  description: string;
  netPaid: number;
  billDate: string;
  reimbursementStatus: string;
  createdAt: string;
  fraudScore: number | null;
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
  reimbursementRejectedReason?: string;
  slipUrls: string[];
}

interface Summary {
  pendingApproval: { count: number; amount: number };
  flagged: { count: number; amount: number };
  pendingPayment: { count: number; amount: number };
  paid: { count: number; amount: number };
  rejected: { count: number; amount: number };
}

export default function ReimbursementsPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my");
  const [companyId, setCompanyId] = useState<string | null>(null);

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

  // Fetch data - using new ReimbursementRequest API
  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const myRequests = activeTab === "my";
        const [requestsRes, summaryRes] = await Promise.all([
          fetch(
            `/api/reimbursement-requests?companyId=${companyId}${myRequests ? "&myRequests=true" : ""}`
          ),
          fetch(`/api/reimbursement-requests/summary?companyId=${companyId}`),
        ]);

        const requestsResult = await requestsRes.json();
        const summaryResult = await summaryRes.json();

        // Map from requests to reimbursements format for compatibility
        const mappedData = (requestsResult.data?.requests || []).map((req: any) => ({
          id: req.id,
          description: req.description,
          netPaid: req.netAmount,
          billDate: req.billDate,
          reimbursementStatus: req.status,
          createdAt: req.createdAt,
          fraudScore: req.fraudScore,
          requester: req.requester,
          categoryRef: req.categoryRef,
          reimbursementRejectedReason: req.rejectedReason,
          slipUrls: req.receiptUrls,
        }));

        setReimbursements(mappedData);
        setSummary(summaryResult.data?.summary || null);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [companyId, activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="เบิกจ่ายพนักงาน"
        description="จัดการคำขอเบิกจ่ายและติดตามสถานะ"
        actions={
          <Button
            onClick={() =>
              router.push(`/${companyCode.toLowerCase()}/reimbursements/new`)
            }
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            ขอเบิกจ่าย
          </Button>
        }
      />

      {/* Stats Cards - Clickable */}
      {summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Link href={`/${companyCode.toLowerCase()}/reimbursements/approvals`}>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800 hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400">รออนุมัติ</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {summary.pendingApproval.count + summary.flagged.count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(
                        summary.pendingApproval.amount + summary.flagged.amount
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 group-hover:scale-110 transition-transform">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/${companyCode.toLowerCase()}/reimbursements/payouts`}>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400">รอจ่ายเงิน</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {summary.pendingPayment.count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(summary.pendingPayment.amount)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

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
                  <p className="text-sm text-muted-foreground">ถูกปฏิเสธ</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {summary.rejected.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.rejected.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/30">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs & Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">รายการเบิกจ่าย</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="my">ของฉัน</TabsTrigger>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                ยังไม่มีรายการเบิกจ่าย
              </h3>
              <p className="text-muted-foreground mb-6">
                เริ่มต้นโดยกดปุ่ม "ขอเบิกจ่าย" ด้านบน
              </p>
              <Button
                onClick={() =>
                  router.push(
                    `/${companyCode.toLowerCase()}/reimbursements/new`
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                ขอเบิกจ่ายครั้งแรก
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[100px]">วันที่</TableHead>
                    <TableHead className="w-[130px] text-center">
                      สถานะ
                    </TableHead>
                    {activeTab === "all" && (
                      <TableHead className="w-[150px]">ผู้ขอ</TableHead>
                    )}
                    <TableHead className="w-[120px]">หมวดหมู่</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Risk
                    </TableHead>
                    <TableHead className="w-[120px] text-right">
                      จำนวนเงิน
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map((item) => (
                    <ReimbursementTableRow
                      key={item.id}
                      reimbursement={item}
                      companyCode={companyCode}
                      showRequester={activeTab === "all"}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
