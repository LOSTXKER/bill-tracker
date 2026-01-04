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
import { ArrowDownCircle, Plus, Filter, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { serializeIncomes } from "@/lib/utils/serializers";
import Link from "next/link";
import { IncomeTableRow } from "@/components/incomes/income-table-row";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatsSkeleton, TableSkeleton } from "@/components/shared/TableSkeleton";

interface IncomesPageProps {
  params: Promise<{ company: string }>;
}

export default async function IncomesPage({ params }: IncomesPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        title="รายรับ"
        description="จัดการรายรับและติดตามสถานะเอกสาร"
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
                เพิ่มรายรับ
              </Button>
            </Link>
          </>
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <IncomeStats companyCode={companyCode} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <IncomesTable companyCode={companyCode} />
      </Suspense>
    </div>
  );
}

async function IncomeStats({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [monthlyTotal, waitingIssue, waitingWht, sentCopy] = await Promise.all([
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { netReceived: true },
      _count: true,
    }),
    prisma.income.count({
      where: { companyId: company.id, status: "WAITING_ISSUE" },
    }),
    prisma.income.count({
      where: { companyId: company.id, status: "WAITING_WHT_CERT" },
    }),
    prisma.income.count({
      where: { companyId: company.id, status: "SENT_COPY" },
    }),
  ]);

  return (
    <StatsGrid
      stats={[
        {
          title: "รายรับเดือนนี้",
          value: formatCurrency(Number(monthlyTotal._sum.netReceived) || 0),
          subtitle: `${monthlyTotal._count} รายการ`,
          icon: ArrowDownCircle,
          iconColor: "text-primary",
        },
        {
          title: "รอออกบิล",
          value: waitingIssue.toString(),
          subtitle: "รายการ",
          iconColor: "text-amber-500",
        },
        {
          title: "รอใบ 50 ทวิ",
          value: waitingWht.toString(),
          subtitle: "รายการ",
          iconColor: "text-amber-500",
        },
        {
          title: "ส่งแล้ว",
          value: sentCopy.toString(),
          subtitle: "รายการ",
          iconColor: "text-primary",
        },
      ]}
    />
  );
}

async function IncomesTable({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const incomes = await prisma.income.findMany({
    where: { companyId: company.id },
    orderBy: { receiveDate: "desc" },
    take: 50,
    include: {
      contact: true,
    },
  });

  // Serialize incomes for client component
  const serializedIncomes = serializeIncomes(incomes);

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">รายการรายรับ</CardTitle>
      </CardHeader>
      <CardContent>
        {incomes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ArrowDownCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ยังไม่มีรายรับ
            </p>
            <Link href={`/${companyCode.toLowerCase()}/capture`}>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มรายรับแรก
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ลูกค้า/แหล่งที่มา</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">จำนวนเงิน</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">WHT</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">สถานะ</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">LINE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serializedIncomes.map((income) => (
                  <IncomeTableRow
                    key={income.id}
                    income={income}
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

