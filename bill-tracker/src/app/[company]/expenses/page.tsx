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
import { getCompanyId } from "@/lib/cache/company";
import { getExpenseStats } from "@/lib/cache/stats";

interface ExpensesPageProps {
  params: Promise<{ company: string }>;
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
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
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Use cached stats for better performance
  const stats = await getExpenseStats(companyId);

  // Calculate trend
  const trendValue = stats.lastMonthTotal > 0 
    ? ((stats.monthlyTotal - stats.lastMonthTotal) / stats.lastMonthTotal) * 100 
    : 0;

  // Calculate progress percentages
  const totalPending = stats.waitingTaxInvoice + stats.readyForAccounting;
  const waitingDocsProgress = totalPending > 0 ? (stats.waitingTaxInvoice / totalPending) * 100 : 0;
  const readyProgress = totalPending > 0 ? (stats.readyForAccounting / totalPending) * 100 : 0;
  const sentProgress = stats.totalExpenses > 0 ? (stats.sentToAccountant / stats.totalExpenses) * 100 : 0;

  return (
    <StatsGrid
      stats={[
        {
          title: "รายจ่ายเดือนนี้",
          value: formatCurrency(stats.monthlyTotal),
          subtitle: `${stats.monthlyCount} รายการ`,
          icon: "arrow-up-circle",
          iconColor: "text-destructive",
          featured: true,
          trend: trendValue !== 0 ? {
            value: Math.abs(Math.round(trendValue)),
            isPositive: trendValue > 0,
          } : undefined,
        },
        {
          title: "รอใบกำกับ",
          value: stats.waitingTaxInvoice.toString(),
          subtitle: "รายการ",
          icon: "clock",
          iconColor: "text-amber-500",
          progress: waitingDocsProgress,
        },
        {
          title: "พร้อมส่งบัญชี",
          value: stats.readyForAccounting.toString(),
          subtitle: "รายการ",
          icon: "file-text",
          iconColor: "text-blue-500",
          progress: readyProgress,
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

async function ExpensesData({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Filter: Only show regular expenses OR reimbursements that have been PAID
  // REJECTED/PENDING/APPROVED reimbursements should NOT appear in expenses
  const whereClause = {
    companyId,
    deletedAt: null,
    OR: [
      { isReimbursement: false },
      { isReimbursement: true, reimbursementStatus: "PAID" as const },
    ],
  };

  const [expensesRaw, total] = await Promise.all([
    prisma.expense.findMany({
      where: whereClause,
      // Sort by billDate first, then createdAt for consistent ordering (same as API)
      orderBy: [
        { billDate: "desc" },
        { createdAt: "desc" },
      ],
      take: 20,
      include: {
        Contact: true,
        Account: true,
        User_Expense_createdByToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.expense.count({ where: whereClause }),
  ]);

  // Map Prisma relation names to what the client expects
  const expenses = expensesRaw.map((expense) => {
    const { Contact, Account, User_Expense_createdByToUser, ...rest } = expense;
    return {
      ...rest,
      contact: Contact,
      account: Account,
      creator: User_Expense_createdByToUser,
    };
  });

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

