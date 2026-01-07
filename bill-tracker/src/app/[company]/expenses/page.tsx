import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { serializeExpenses } from "@/lib/utils/serializers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatsSkeleton, TableSkeleton } from "@/components/shared/TableSkeleton";
import { ExpensesClient } from "@/components/expenses/ExpensesClient";

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
          <Link href={`/${companyCode.toLowerCase()}/capture?type=expense`}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มรายจ่าย
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <ExpenseStats companyCode={companyCode} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <ExpensesData companyCode={companyCode} />
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
  
  // Previous month for trend calculation
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    monthlyTotal,
    lastMonthTotal,
    waitingDocs,
    pendingPhysical,
    sentToAccount,
    totalExpenses
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        companyId: company.id,
        billDate: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        companyId: company.id,
        billDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        deletedAt: null,
      },
      _sum: { netPaid: true },
    }),
    prisma.expense.count({
      where: { companyId: company.id, status: "WAITING_FOR_DOC", deletedAt: null },
    }),
    prisma.expense.count({
      where: { companyId: company.id, status: "PENDING_PHYSICAL", deletedAt: null },
    }),
    prisma.expense.count({
      where: { companyId: company.id, status: "SENT_TO_ACCOUNT", deletedAt: null },
    }),
    prisma.expense.count({
      where: { companyId: company.id, deletedAt: null },
    }),
  ]);

  // Calculate trend
  const currentAmount = Number(monthlyTotal._sum.netPaid) || 0;
  const lastMonthAmount = Number(lastMonthTotal._sum.netPaid) || 0;
  const trendValue = lastMonthAmount > 0 
    ? ((currentAmount - lastMonthAmount) / lastMonthAmount) * 100 
    : 0;

  // Calculate progress percentages
  const totalPending = waitingDocs + pendingPhysical;
  const waitingDocsProgress = totalPending > 0 ? (waitingDocs / totalPending) * 100 : 0;
  const pendingPhysicalProgress = totalPending > 0 ? (pendingPhysical / totalPending) * 100 : 0;
  const sentProgress = totalExpenses > 0 ? (sentToAccount / totalExpenses) * 100 : 0;

  return (
    <StatsGrid
      stats={[
        {
          title: "รายจ่ายเดือนนี้",
          value: formatCurrency(currentAmount),
          subtitle: `${monthlyTotal._count} รายการ`,
          icon: "arrow-up-circle",
          iconColor: "text-destructive",
          featured: true,
          trend: trendValue !== 0 ? {
            value: Math.abs(Math.round(trendValue)),
            isPositive: trendValue > 0,
          } : undefined,
        },
        {
          title: "รอใบเสร็จ",
          value: waitingDocs.toString(),
          subtitle: "รายการ",
          icon: "clock",
          iconColor: "text-amber-500",
          progress: waitingDocsProgress,
        },
        {
          title: "รอส่งบัญชี",
          value: pendingPhysical.toString(),
          subtitle: "รายการ",
          icon: "file-text",
          iconColor: "text-amber-500",
          progress: pendingPhysicalProgress,
        },
        {
          title: "ส่งแล้ว",
          value: sentToAccount.toString(),
          subtitle: "รายการ",
          icon: "check-circle",
          iconColor: "text-primary",
          progress: sentProgress,
        },
      ]}
    />
  );
}

async function ExpensesData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { billDate: "desc" },
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
    prisma.expense.count({ where: { companyId: company.id, deletedAt: null } }),
  ]);

  // Serialize expenses for client component
  const serializedExpenses = serializeExpenses(expenses);

  return (
    <ExpensesClient
      companyCode={companyCode}
      initialExpenses={serializedExpenses}
      initialTotal={total}
    />
  );
}

