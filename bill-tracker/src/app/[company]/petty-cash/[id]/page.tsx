"use client";

import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";

interface PettyCashDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

interface Transaction {
  id: string;
  type: "EXPENSE" | "REPLENISH" | "ADJUSTMENT";
  amount: number;
  description: string | null;
  createdAt: string;
  Expense: { id: string; description: string } | null;
  User: { id: string; name: string };
}

interface PettyCashFund {
  id: string;
  name: string;
  initialAmount: number;
  currentAmount: number;
  lowThreshold: number | null;
  isActive: boolean;
  Custodian: { id: string; name: string; email: string } | null;
  Transactions: Transaction[];
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PettyCashDetailPage({
  params,
}: PettyCashDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const router = useRouter();

  // Fetch fund details
  const { data, isLoading } = useSWR<{ fund: PettyCashFund }>(
    `/api/${companyCode}/petty-cash/${id}`,
    fetcher
  );

  const fund = data?.fund;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "EXPENSE":
        return <Minus className="h-4 w-4 text-red-500" />;
      case "REPLENISH":
        return <Plus className="h-4 w-4 text-emerald-500" />;
      case "ADJUSTMENT":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "EXPENSE":
        return "จ่ายออก";
      case "REPLENISH":
        return "เติมเงิน";
      case "ADJUSTMENT":
        return "ปรับยอด";
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "EXPENSE":
        return "text-red-600";
      case "REPLENISH":
        return "text-emerald-600";
      case "ADJUSTMENT":
        return "text-blue-600";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-lg">ไม่พบกองทุนเงินสดย่อย</h3>
              <Button onClick={() => router.push(`/${companyCode}/petty-cash`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                กลับ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLow = fund.lowThreshold && fund.currentAmount <= fund.lowThreshold;
  const usagePercent =
    fund.initialAmount > 0
      ? ((fund.initialAmount - fund.currentAmount) / fund.initialAmount) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${companyCode}/petty-cash`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title={fund.name}
            description={
              fund.Custodian
                ? `ผู้ดูแล: ${fund.Custodian.name}`
                : "ไม่มีผู้ดูแล"
            }
          />
        </div>
        {!fund.isActive && <Badge variant="secondary">ปิดใช้งาน</Badge>}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className={
            isLow
              ? "border-amber-300 dark:border-amber-700"
              : "border-emerald-300 dark:border-emerald-700"
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ยอดคงเหลือ</p>
                <p
                  className={`text-2xl font-bold ${
                    isLow ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(fund.currentAmount)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  isLow ? "bg-amber-100" : "bg-emerald-100"
                }`}
              >
                {isLow ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ยอดตั้งต้น</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(fund.initialAmount)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ใช้ไปแล้ว</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(fund.initialAmount - fund.currentAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {usagePercent.toFixed(0)}% ของยอดตั้งต้น
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {fund.lowThreshold && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ยอดขั้นต่ำเตือน</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(fund.lowThreshold)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-muted">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการทำรายการ</CardTitle>
        </CardHeader>
        <CardContent>
          {fund.Transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              ยังไม่มีรายการ
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>ผู้ทำรายการ</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fund.Transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatThaiDate(new Date(tx.createdAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.type)}
                        <span>{getTransactionLabel(tx.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.Expense ? (
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() =>
                            router.push(
                              `/${companyCode}/expenses/${tx.Expense?.id}`
                            )
                          }
                        >
                          {tx.Expense.description || "ดูรายจ่าย"}
                        </Button>
                      ) : (
                        tx.description || "-"
                      )}
                    </TableCell>
                    <TableCell>{tx.User.name}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${getTransactionColor(
                        tx.type
                      )}`}
                    >
                      {tx.type === "EXPENSE" ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
