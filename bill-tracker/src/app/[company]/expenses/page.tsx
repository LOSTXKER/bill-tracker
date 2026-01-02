import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpCircle, Plus, Filter, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import Link from "next/link";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
} from "@/lib/validations/expense";

interface ExpensesPageProps {
  params: Promise<{ company: string }>;
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            รายจ่าย
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            จัดการรายจ่ายและติดตามสถานะเอกสาร
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            กรอง
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            ส่งออก
          </Button>
          <Link href={`/${companyCode.toLowerCase()}/capture`}>
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มรายจ่าย
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <ExpenseStats companyCode={companyCode} />
      </Suspense>

      {/* Table */}
      <Suspense fallback={<TableSkeleton />}>
        <ExpensesTable companyCode={companyCode} />
      </Suspense>
    </div>
  );
}

async function ExpenseStats({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [monthlyTotal, waitingDocs, pendingPhysical, sentToAccount] =
    await Promise.all([
      prisma.expense.aggregate({
        where: {
          companyId: company.id,
          billDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { netPaid: true },
        _count: true,
      }),
      prisma.expense.count({
        where: { companyId: company.id, status: "WAITING_FOR_DOC" },
      }),
      prisma.expense.count({
        where: { companyId: company.id, status: "PENDING_PHYSICAL" },
      }),
      prisma.expense.count({
        where: { companyId: company.id, status: "SENT_TO_ACCOUNT" },
      }),
    ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            รายจ่ายเดือนนี้
          </CardTitle>
          <ArrowUpCircle className="h-5 w-5 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(Number(monthlyTotal._sum.netPaid) || 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {monthlyTotal._count} รายการ
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            รอใบเสร็จ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {waitingDocs}
          </div>
          <p className="text-xs text-slate-500 mt-1">รายการ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            รอส่งบัญชี
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingPhysical}
          </div>
          <p className="text-xs text-slate-500 mt-1">รายการ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            ส่งแล้ว
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {sentToAccount}
          </div>
          <p className="text-xs text-slate-500 mt-1">รายการ</p>
        </CardContent>
      </Card>
    </div>
  );
}

async function ExpensesTable({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const expenses = await prisma.expense.findMany({
    where: { companyId: company.id },
    orderBy: { billDate: "desc" },
    take: 50,
    include: {
      vendor: true,
    },
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = EXPENSE_STATUS_LABELS[status] || {
      label: status,
      color: "gray",
    };
    const colorMap: Record<string, string> = {
      orange:
        "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
      red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
      yellow:
        "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
      green:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    return (
      <Badge
        variant="outline"
        className={colorMap[statusInfo.color] || colorMap.gray}
      >
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการรายจ่าย</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpCircle className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              ยังไม่มีรายจ่าย
            </p>
            <Link href={`/${companyCode.toLowerCase()}/capture`}>
              <Button className="mt-4" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มรายจ่ายแรก
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ผู้ขาย/รายละเอียด</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: typeof expenses[number]) => (
                  <TableRow key={expense.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <TableCell className="whitespace-nowrap">
                      {new Date(expense.billDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {expense.vendor?.name ||
                            expense.vendorName ||
                            "ไม่ระบุผู้ขาย"}
                        </p>
                        {expense.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">
                            {expense.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.category
                        ? EXPENSE_CATEGORY_LABELS[expense.category] ||
                          expense.category
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(Number(expense.netPaid))}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(expense.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
