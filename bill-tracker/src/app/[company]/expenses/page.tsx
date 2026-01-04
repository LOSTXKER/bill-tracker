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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            รายจ่าย
          </h1>
          <p className="text-muted-foreground mt-1">
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

  const stats = [
    {
      title: "รายจ่ายเดือนนี้",
      value: formatCurrency(Number(monthlyTotal._sum.netPaid) || 0),
      subtitle: `${monthlyTotal._count} รายการ`,
      icon: ArrowUpCircle,
      iconColor: "text-destructive",
    },
    {
      title: "รอใบเสร็จ",
      value: waitingDocs.toString(),
      subtitle: "รายการ",
      iconColor: "text-amber-500",
    },
    {
      title: "รอส่งบัญชี",
      value: pendingPhysical.toString(),
      subtitle: "รายการ",
      iconColor: "text-amber-500",
    },
    {
      title: "ส่งแล้ว",
      value: sentToAccount.toString(),
      subtitle: "รายการ",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
      {stats.map((stat, i) => (
        <Card key={i} className="border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            {stat.icon && <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${stat.iconColor || "text-foreground"}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
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
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
      red: "bg-destructive/10 text-destructive border-destructive/20",
      yellow:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
      green:
        "bg-primary/10 text-primary border-primary/20",
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
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">รายการรายจ่าย</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ArrowUpCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ยังไม่มีรายจ่าย
            </p>
            <Link href={`/${companyCode.toLowerCase()}/capture`}>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มรายจ่ายแรก
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ขาย/รายละเอียด</TableHead>
                  <TableHead className="text-muted-foreground font-medium">หมวดหมู่</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">จำนวนเงิน</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: typeof expenses[number]) => (
                  <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <TableCell className="whitespace-nowrap text-foreground">
                      {new Date(expense.billDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {expense.vendor?.name ||
                            expense.vendorName ||
                            "ไม่ระบุผู้ขาย"}
                        </p>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {expense.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.category
                        ? EXPENSE_CATEGORY_LABELS[expense.category] ||
                          expense.category
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
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
        <Card key={i} className="border-border/50">
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
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </CardContent>
    </Card>
  );
}
