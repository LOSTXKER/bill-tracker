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
import { getCompanyId } from "@/lib/cache/company";
import { getIncomeStats } from "@/lib/cache/stats";

interface IncomesPageProps {
  params: Promise<{ company: string }>;
}

export default async function IncomesPage({ params }: IncomesPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
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
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Use cached stats for better performance
  const stats = await getIncomeStats(companyId);

  // Calculate trend
  const trendValue = stats.lastMonthTotal > 0 
    ? ((stats.monthlyTotal - stats.lastMonthTotal) / stats.lastMonthTotal) * 100 
    : 0;

  // Calculate progress percentages
  const totalPending = stats.waitingInvoice + stats.waitingWhtCert;
  const waitingInvoiceProgress = totalPending > 0 ? (stats.waitingInvoice / totalPending) * 100 : 0;
  const waitingWhtProgress = totalPending > 0 ? (stats.waitingWhtCert / totalPending) * 100 : 0;
  const sentProgress = stats.totalIncomes > 0 ? (stats.sentToAccountant / stats.totalIncomes) * 100 : 0;

  return (
    <StatsGrid
      stats={[
        {
          title: "รายรับเดือนนี้",
          value: formatCurrency(stats.monthlyTotal),
          subtitle: `${stats.monthlyCount} รายการ`,
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
          value: stats.waitingInvoice.toString(),
          subtitle: "รายการ",
          icon: "clock",
          iconColor: "text-amber-500",
          progress: waitingInvoiceProgress,
        },
        {
          title: "รอใบ 50 ทวิ",
          value: stats.waitingWhtCert.toString(),
          subtitle: "รายการ",
          icon: "file-text",
          iconColor: "text-amber-500",
          progress: waitingWhtProgress,
        },
        {
          title: "ส่งบัญชีแล้ว",
          value: stats.sentToAccountant.toString(),
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
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const [incomesRaw, total] = await Promise.all([
    prisma.income.findMany({
      where: { companyId: companyId, deletedAt: null },
      orderBy: { receiveDate: "desc" },
      take: 20,
      include: {
        Contact: true,
        Account: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.income.count({ where: { companyId: companyId, deletedAt: null } }),
  ]);

  // Map Prisma relation names to what the client expects
  const incomes = incomesRaw.map((income) => {
    const { Contact, Account, User, ...rest } = income;
    return {
      ...rest,
      contact: Contact,
      account: Account,
      creator: User,
    };
  });

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

