import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatsSkeleton, TableSkeleton } from "@/components/shared/TableSkeleton";
import { ApprovalsClient } from "@/components/approvals/ApprovalsClient";
import { getCompanyId } from "@/lib/cache/company";
import { getSession } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/permissions/checker";
import { redirect } from "next/navigation";
import { serializeExpenses, serializeIncomes } from "@/lib/utils/serializers";

interface ApprovalsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ApprovalsPage({ params, searchParams }: ApprovalsPageProps) {
  const { company: companyCode } = await params;
  const urlParams = await searchParams;

  // Check if user has permission to approve
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const companyId = await getCompanyId(companyCode);
  if (!companyId) {
    redirect("/");
  }

  const canApprove = await hasAnyPermission(
    session.user.id,
    companyId,
    ["expenses:approve", "incomes:approve"]
  );

  if (!canApprove) {
    redirect(`/${companyCode}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="รออนุมัติ"
        description="จัดการรายการที่รอการอนุมัติ"
      />

      <Suspense fallback={<StatsSkeleton />}>
        <ApprovalStats companyCode={companyCode} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <ApprovalsData 
          companyCode={companyCode} 
          searchParams={urlParams} 
          currentUserId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function ApprovalStats({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Count pending items
  const [pendingExpenses, pendingIncomes, oldestExpense, oldestIncome] = await Promise.all([
    prisma.expense.count({
      where: {
        companyId,
        approvalStatus: "PENDING",
        deletedAt: null,
      },
    }),
    prisma.income.count({
      where: {
        companyId,
        approvalStatus: "PENDING",
        deletedAt: null,
      },
    }),
    prisma.expense.findFirst({
      where: {
        companyId,
        approvalStatus: "PENDING",
        deletedAt: null,
      },
      orderBy: { submittedAt: "asc" },
      select: { submittedAt: true },
    }),
    prisma.income.findFirst({
      where: {
        companyId,
        approvalStatus: "PENDING",
        deletedAt: null,
      },
      orderBy: { submittedAt: "asc" },
      select: { submittedAt: true },
    }),
  ]);

  const totalPending = pendingExpenses + pendingIncomes;
  
  // Calculate oldest pending item
  let oldestDays = 0;
  const oldestDate = oldestExpense?.submittedAt && oldestIncome?.submittedAt
    ? (oldestExpense.submittedAt < oldestIncome.submittedAt ? oldestExpense.submittedAt : oldestIncome.submittedAt)
    : (oldestExpense?.submittedAt || oldestIncome?.submittedAt);
  
  if (oldestDate) {
    oldestDays = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <StatsGrid
      stats={[
        {
          title: "รอดำเนินการ",
          value: totalPending.toString(),
          subtitle: "รายการทั้งหมด",
          icon: "clock",
          iconColor: "text-amber-500",
          featured: true,
        },
        {
          title: "รายจ่ายรออนุมัติ",
          value: pendingExpenses.toString(),
          subtitle: "รายการ",
          icon: "arrow-up-circle",
          iconColor: "text-destructive",
        },
        {
          title: "รายรับรออนุมัติ",
          value: pendingIncomes.toString(),
          subtitle: "รายการ",
          icon: "arrow-down-circle",
          iconColor: "text-primary",
        },
        {
          title: "รอนานสุด",
          value: oldestDays > 0 ? `${oldestDays} วัน` : "-",
          subtitle: oldestDays > 7 ? "ควรตรวจสอบ" : "ปกติ",
          icon: "alert-circle",
          iconColor: oldestDays > 7 ? "text-red-500" : "text-muted-foreground",
        },
      ]}
    />
  );
}

interface ApprovalsDataProps {
  companyCode: string;
  searchParams: { [key: string]: string | string[] | undefined };
  currentUserId: string;
}

async function ApprovalsData({ companyCode, searchParams, currentUserId }: ApprovalsDataProps) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const type = (searchParams.type as string) || "all";
  const sortBy = (searchParams.sortBy as string) || "submittedAt";
  const sortOrder = (searchParams.sortOrder as string) || "asc";
  const page = parseInt((searchParams.page as string) || "1");
  const limit = parseInt((searchParams.limit as string) || "20");

  // Build order by
  const orderBy: any = {};
  if (sortBy === "submittedAt") {
    orderBy.submittedAt = sortOrder;
  } else if (sortBy === "amount") {
    orderBy.netPaid = sortOrder; // Will be netReceived for incomes
  } else {
    orderBy.submittedAt = "asc";
  }

  // Fetch pending expenses
  let expenses: any[] = [];
  let expensesTotal = 0;
  if (type === "all" || type === "expense") {
    const [expensesRaw, count] = await Promise.all([
      prisma.expense.findMany({
        where: {
          companyId,
          approvalStatus: "PENDING",
          deletedAt: null,
        },
        orderBy: { submittedAt: sortOrder as "asc" | "desc" },
        skip: type === "expense" ? (page - 1) * limit : 0,
        take: type === "expense" ? limit : 100,
        include: {
          Contact: true,
          Account: true,
          User_Expense_createdByToUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          User_Expense_submittedByToUser: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.expense.count({
        where: {
          companyId,
          approvalStatus: "PENDING",
          deletedAt: null,
        },
      }),
    ]);

    expenses = expensesRaw.map((e) => ({
      ...e,
      contact: e.Contact,
      account: e.Account,
      creator: e.User_Expense_createdByToUser,
      submittedByUser: e.User_Expense_submittedByToUser,
      _type: "expense" as const,
    }));
    expensesTotal = count;
  }

  // Fetch pending incomes
  let incomes: any[] = [];
  let incomesTotal = 0;
  if (type === "all" || type === "income") {
    const [incomesRaw, count] = await Promise.all([
      prisma.income.findMany({
        where: {
          companyId,
          approvalStatus: "PENDING",
          deletedAt: null,
        },
        orderBy: { submittedAt: sortOrder as "asc" | "desc" },
        skip: type === "income" ? (page - 1) * limit : 0,
        take: type === "income" ? limit : 100,
        include: {
          Contact: true,
          Account: true,
          User: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.income.count({
        where: {
          companyId,
          approvalStatus: "PENDING",
          deletedAt: null,
        },
      }),
    ]);

    incomes = incomesRaw.map((i) => ({
      ...i,
      contact: i.Contact,
      account: i.Account,
      creator: i.User,
      _type: "income" as const,
    }));
    incomesTotal = count;
  }

  // Serialize data
  const serializedExpenses = serializeExpenses(expenses);
  const serializedIncomes = serializeIncomes(incomes);

  return (
    <ApprovalsClient
      companyCode={companyCode}
      expenses={serializedExpenses as any[]}
      incomes={serializedIncomes as any[]}
      expensesTotal={expensesTotal}
      incomesTotal={incomesTotal}
      currentUserId={currentUserId}
      activeType={type as "all" | "expense" | "income"}
    />
  );
}
