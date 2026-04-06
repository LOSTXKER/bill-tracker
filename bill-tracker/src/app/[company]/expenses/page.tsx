import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Prisma, WorkflowStatus } from "@prisma/client";
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
import { getSession } from "@/lib/auth";
import {
  buildExpenseBaseWhere,
  buildExpenseSelfWhere,
  buildExpensePayOnBehalfWhere,
} from "@/lib/queries/expense-filters";
import { toThaiStartOfDay, toThaiEndOfDay } from "@/lib/queries/date-utils";

interface ExpensesPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ExpensesPage({ params, searchParams }: ExpensesPageProps) {
  const { company: companyCode } = await params;
  const urlParams = await searchParams;

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
        <ExpenseStats 
          companyCode={companyCode} 
          dateFrom={urlParams.dateFrom as string | undefined}
          dateTo={urlParams.dateTo as string | undefined}
        />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <ExpensesData companyCode={companyCode} searchParams={urlParams} />
      </Suspense>
    </div>
  );
}

interface ExpenseStatsProps {
  companyCode: string;
  dateFrom?: string;
  dateTo?: string;
}

async function ExpenseStats({ companyCode, dateFrom, dateTo }: ExpenseStatsProps) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Use stats with date filter if provided
  const dateFilter = (dateFrom || dateTo) ? { dateFrom, dateTo } : undefined;
  const stats = await getExpenseStats(companyId, "internal", dateFilter);

  // Calculate trend (only show when not filtered)
  const trendValue = !stats.isFiltered && stats.lastMonthTotal > 0 
    ? ((stats.monthlyTotal - stats.lastMonthTotal) / stats.lastMonthTotal) * 100 
    : 0;

  // Calculate progress percentages
  const totalPending = stats.waitingTaxInvoice + stats.readyForAccounting;
  const waitingDocsProgress = totalPending > 0 ? (stats.waitingTaxInvoice / totalPending) * 100 : 0;
  const readyProgress = totalPending > 0 ? (stats.readyForAccounting / totalPending) * 100 : 0;
  const sentProgress = stats.totalExpenses > 0 ? (stats.sentToAccountant / stats.totalExpenses) * 100 : 0;

  // Dynamic title based on filter
  const periodTitle = stats.isFiltered ? "รายจ่ายช่วงที่เลือก" : "รายจ่ายเดือนนี้";

  return (
    <StatsGrid
      stats={[
        {
          title: periodTitle,
          value: formatCurrency(stats.monthlyTotal),
          subtitle: `${stats.monthlyCount} รายการ`,
          icon: "arrow-up-circle",
          iconColor: "text-destructive",
          featured: true,
          trend: !stats.isFiltered && trendValue !== 0 ? {
            value: Math.abs(Math.round(trendValue)),
            isPositive: trendValue > 0,
          } : undefined,
        },
        {
          title: "รอเอกสาร",
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

interface ExpensesDataProps {
  companyCode: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

async function ExpensesData({ companyCode, searchParams }: ExpensesDataProps) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Get session and check permissions
  const session = await getSession();
  const currentUserId = session?.user?.id;
  
  // Single CompanyAccess query per user — derive all permissions from it
  const [userAccess, companiesRaw] = await Promise.all([
    currentUserId
      ? prisma.companyAccess.findUnique({
          where: { userId_companyId: { userId: currentUserId, companyId } },
        })
      : Promise.resolve(null),
    currentUserId
      ? prisma.companyAccess.findMany({
          where: { userId: currentUserId },
          select: { Company: { select: { id: true, name: true, code: true } } },
        })
      : Promise.resolve([]),
  ]);

  const isOwner = userAccess?.isOwner || false;
  const userPermissions = (userAccess?.permissions as string[]) || [];
  const canApprove =
    isOwner ||
    userPermissions.includes("expenses:approve") ||
    userPermissions.includes("expenses:*");
  const companies = companiesRaw.map((ca) => ca.Company);

  // Parse URL params
  const sortBy = (searchParams.sortBy as string) || "createdAt";
  const sortOrder = (searchParams.sortOrder as string) || "desc";
  const sortDir = sortOrder as Prisma.SortOrder;
  const page = parseInt((searchParams.page as string) || "1");
  const limit = parseInt((searchParams.limit as string) || "20");
  const search = searchParams.search as string | undefined;
  const status = searchParams.status as string | undefined;
  const tab = searchParams.tab as string | undefined; // For approval/draft/rejected tabs
  const category = searchParams.category as string | undefined;
  const contact = searchParams.contact as string | undefined;
  const creator = searchParams.creator as string | undefined;
  const dateFrom = searchParams.dateFrom as string | undefined;
  const dateTo = searchParams.dateTo as string | undefined;
  // Ownership filter: null (all), "self" (paid by us), "payOnBehalf" (paid by another company)
  const ownership = searchParams.ownership as string | undefined;

  // Build where clause using shared filter builders
  let whereClause: Prisma.ExpenseWhereInput;
  if (ownership === "self") {
    whereClause = buildExpenseSelfWhere(companyId);
  } else if (ownership === "payOnBehalf") {
    whereClause = buildExpensePayOnBehalfWhere(companyId);
  } else {
    whereClause = buildExpenseBaseWhere(companyId);
  }

  if (search) {
    const searchCondition = {
      OR: [
        { description: { contains: search, mode: "insensitive" as const } },
        { invoiceNumber: { contains: search, mode: "insensitive" as const } },
        { Contact: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    };
    const existing = Array.isArray(whereClause.AND) ? whereClause.AND : [];
    whereClause.AND = [...existing, searchCondition];
  }

  if (status) {
    if (status.includes(",")) {
      whereClause.workflowStatus = { in: status.split(",") as WorkflowStatus[] };
    } else {
      whereClause.workflowStatus = status as WorkflowStatus;
    }
  }

  // Handle special tab filters (approval status)
  if (tab === "pending") {
    whereClause.workflowStatus = "PENDING_APPROVAL";
  } else if (tab === "rejected") {
    // Show rejected items
    whereClause.approvalStatus = "REJECTED";
  } else if (tab === "draft") {
    // Show draft items created by current user
    whereClause.workflowStatus = "DRAFT";
    if (currentUserId) {
      whereClause.createdBy = currentUserId;
    }
  }

  if (category) {
    whereClause.categoryId = category;
  }

  if (contact) {
    whereClause.contactId = contact;
  }

  if (creator) {
    whereClause.createdBy = creator;
  }

  if (dateFrom || dateTo) {
    whereClause.billDate = {};
    if (dateFrom) {
      whereClause.billDate.gte = toThaiStartOfDay(dateFrom);
    }
    if (dateTo) {
      whereClause.billDate.lte = toThaiEndOfDay(dateTo);
    }
  }

  // Build orderBy - always include secondary sort for consistency
  const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = [];
  if (sortBy === "billDate") {
    orderBy.push({ billDate: sortDir });
    orderBy.push({ createdAt: "desc" }); // Secondary sort
  } else if (sortBy === "createdAt") {
    orderBy.push({ createdAt: sortDir });
  } else if (sortBy === "amount") {
    orderBy.push({ netPaid: sortDir });
    orderBy.push({ createdAt: "desc" });
  } else if (sortBy === "creator") {
    orderBy.push({ User_Expense_createdByToUser: { name: sortDir } });
    orderBy.push({ createdAt: "desc" });
  } else if (sortBy === "contact") {
    orderBy.push({ Contact: { name: sortDir } });
    orderBy.push({ createdAt: "desc" });
  } else if (sortBy === "updatedAt") {
    orderBy.push({ updatedAt: sortDir });
  } else {
    orderBy.push({ billDate: "desc" });
    orderBy.push({ createdAt: "desc" });
  }

  // Base where clause for counting (always internal view — real ownership)
  const baseWhereClause = buildExpenseBaseWhere(companyId);

  const [expensesRaw, total, tabCounts, crossCompanyCount] = await Promise.all([
    prisma.expense.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Contact: true,
        Account: true,
        Category: { include: { Parent: { select: { id: true, name: true } } } },
        Company: true,
        InternalCompany: true,
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
    // Count for each tab
    Promise.all([
      prisma.expense.count({ where: baseWhereClause }), // all
      currentUserId 
        ? prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: "DRAFT", createdBy: currentUserId } })
        : Promise.resolve(0), // draft (my drafts)
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: "PENDING_APPROVAL" } }), // pending
      prisma.expense.count({ where: { ...baseWhereClause, approvalStatus: "REJECTED" } }), // rejected
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: "ACTIVE" } }), // active
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: "READY_FOR_ACCOUNTING" } }), // ready
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: { in: ["SENT_TO_ACCOUNTANT", "COMPLETED"] } } }), // sent
    ]).then(([all, draft, pending, rejected, active, ready, sent]) => ({
      all,
      draft,
      pending,
      rejected,
      active,
      ready,
      sent,
    })),
    // Count cross-company expenses (paid by others for this company) — for warning banner
    prisma.expense.count({
      where: buildExpensePayOnBehalfWhere(companyId),
    }),
  ]);

  // Map Prisma relation names to what the client expects
  const expenses = expensesRaw.map((expense) => {
    const { Contact, Account, Category, Company, InternalCompany, User_Expense_createdByToUser, ...rest } = expense;
    return {
      ...rest,
      contact: Contact,
      account: Account,
      category: Category ? { id: Category.id, name: Category.name, parent: Category.Parent } : null,
      company: Company,
      internalCompany: InternalCompany,
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
      currentUserId={currentUserId}
      canApprove={canApprove}
      isOwner={isOwner}
      tabCounts={tabCounts}
      crossCompanyCount={crossCompanyCount}
      companies={companies}
    />
  );
}

