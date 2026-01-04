import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpCircle, Plus, Filter, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { serializeExpenses } from "@/lib/utils/serializers";
import Link from "next/link";
import { ExpenseTableRow } from "@/components/expenses/expense-table-row";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatsSkeleton, TableSkeleton } from "@/components/shared/TableSkeleton";

interface ExpensesPageProps {
  params: Promise<{ company: string }>;
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        title="รายจ่าย"
        description="จัดการรายจ่ายและติดตามสถานะเอกสาร"
        actions={
          <>
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
          </>
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <ExpenseStats companyCode={companyCode} />
      </Suspense>

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
    <StatsGrid
      stats={[
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
      ]}
    />
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
      contact: true,
    },
  });

  // Serialize expenses for client component (convert Decimal to number)
  const serializedExpenses = serializeExpenses(expenses);

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
                  <TableHead className="text-center text-muted-foreground font-medium">LINE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serializedExpenses.map((expense) => (
                  <ExpenseTableRow
                    key={expense.id}
                    expense={expense}
                    companyCode={companyCode}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

