import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { serializeIncomes } from "@/lib/utils/serializers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatsSkeleton, TableSkeleton } from "@/components/shared/TableSkeleton";
import { IncomesClient } from "@/components/incomes/IncomesClient";

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
          <Link href={`/${companyCode.toLowerCase()}/capture?type=income`}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มรายรับ
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <IncomeStats companyCode={companyCode} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <IncomesData companyCode={companyCode} />
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
  
  // Previous month for trend calculation
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Use new workflow statuses
  const [
    monthlyTotal,
    lastMonthTotal,
    waitingInvoice,
    waitingWhtCert,
    sentToAccountant,
    totalIncomes
  ] = await Promise.all([
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { netReceived: true },
      _count: true,
    }),
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        deletedAt: null,
      },
      _sum: { netReceived: true },
    }),
    prisma.income.count({
      where: { companyId: company.id, workflowStatus: "WAITING_INVOICE_ISSUE", deletedAt: null },
    }),
    prisma.income.count({
      where: { companyId: company.id, workflowStatus: "WHT_PENDING_CERT", deletedAt: null },
    }),
    prisma.income.count({
      where: { companyId: company.id, workflowStatus: "SENT_TO_ACCOUNTANT", deletedAt: null },
    }),
    prisma.income.count({
      where: { companyId: company.id, deletedAt: null },
    }),
  ]);

  // Calculate trend
  const currentAmount = Number(monthlyTotal._sum.netReceived) || 0;
  const lastMonthAmount = Number(lastMonthTotal._sum.netReceived) || 0;
  const trendValue = lastMonthAmount > 0 
    ? ((currentAmount - lastMonthAmount) / lastMonthAmount) * 100 
    : 0;

  // Calculate progress percentages
  const totalPending = waitingInvoice + waitingWhtCert;
  const waitingInvoiceProgress = totalPending > 0 ? (waitingInvoice / totalPending) * 100 : 0;
  const waitingWhtProgress = totalPending > 0 ? (waitingWhtCert / totalPending) * 100 : 0;
  const sentProgress = totalIncomes > 0 ? (sentToAccountant / totalIncomes) * 100 : 0;

  return (
    <StatsGrid
      stats={[
        {
          title: "รายรับเดือนนี้",
          value: formatCurrency(currentAmount),
          subtitle: `${monthlyTotal._count} รายการ`,
          icon: "arrow-down-circle",
          iconColor: "text-primary",
          featured: true,
          trend: trendValue !== 0 ? {
            value: Math.abs(Math.round(trendValue)),
            isPositive: trendValue > 0,
          } : undefined,
        },
        {
          title: "รอออกบิล",
          value: waitingInvoice.toString(),
          subtitle: "รายการ",
          icon: "clock",
          iconColor: "text-amber-500",
          progress: waitingInvoiceProgress,
        },
        {
          title: "รอใบ 50 ทวิ",
          value: waitingWhtCert.toString(),
          subtitle: "รายการ",
          icon: "file-text",
          iconColor: "text-amber-500",
          progress: waitingWhtProgress,
        },
        {
          title: "ส่งบัญชีแล้ว",
          value: sentToAccountant.toString(),
          subtitle: "รายการ",
          icon: "check-circle",
          iconColor: "text-primary",
          progress: sentProgress,
        },
      ]}
    />
  );
}

async function IncomesData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { receiveDate: "desc" },
      take: 20,
      include: {
        contact: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.income.count({ where: { companyId: company.id, deletedAt: null } }),
  ]);

  // Serialize incomes for client component
  const serializedIncomes = serializeIncomes(incomes);

  return (
    <IncomesClient
      companyCode={companyCode}
      initialIncomes={serializedIncomes}
      initialTotal={total}
    />
  );
}

