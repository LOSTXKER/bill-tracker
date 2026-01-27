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
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions/checker";

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
        <ExpenseStats companyCode={companyCode} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <ExpensesData companyCode={companyCode} searchParams={urlParams} />
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

  // Get session and check approval permission
  const session = await getSession();
  const currentUserId = session?.user?.id;
  const canApprove = currentUserId 
    ? await hasPermission(currentUserId, companyId, "expenses:approve")
    : false;

  // Parse URL params
  const sortBy = (searchParams.sortBy as string) || "createdAt";
  const sortOrder = (searchParams.sortOrder as string) || "desc";
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
  // View mode: "official" (default - by companyId), "internal" (by internalCompanyId)
  const viewMode = (searchParams.viewMode as string) || "official";

  // Build where clause
  // Filter: Only show regular expenses OR reimbursements that have been PAID
  // Official view: what we recorded in our books (by companyId)
  // Internal view: actual ownership (internalCompanyId or default to companyId if null)
  const whereClause: any = viewMode === "internal"
    ? {
        // Internal view: Show expenses where this company is the "real" owner
        // Either explicitly set as internalCompanyId, or recorded by us with no internal company
        AND: [
          {
            OR: [
              { internalCompanyId: companyId },
              { companyId: companyId, internalCompanyId: null },
            ],
          },
          {
            OR: [
              { isReimbursement: false },
              { isReimbursement: true, reimbursementStatus: "PAID" as const },
            ],
          },
        ],
        deletedAt: null,
      }
    : {
        // Official view (default): Show expenses recorded under this company
        companyId,
        deletedAt: null,
        OR: [
          { isReimbursement: false },
          { isReimbursement: true, reimbursementStatus: "PAID" as const },
        ],
      };

  if (search) {
    whereClause.AND = [
      {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { Contact: { name: { contains: search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  if (status) {
    if (status.includes(",")) {
      whereClause.workflowStatus = { in: status.split(",") };
    } else {
      whereClause.workflowStatus = status;
    }
  }

  // Handle special tab filters (approval status)
  if (tab === "pending") {
    // Show items pending approval
    whereClause.approvalStatus = "PENDING";
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
      whereClause.billDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      whereClause.billDate.lte = new Date(dateTo);
    }
  }

  // Build orderBy - always include secondary sort for consistency
  const orderBy: any[] = [];
  if (sortBy === "billDate") {
    orderBy.push({ billDate: sortOrder });
    orderBy.push({ createdAt: "desc" }); // Secondary sort
  } else if (sortBy === "createdAt") {
    orderBy.push({ createdAt: sortOrder });
  } else if (sortBy === "amount") {
    orderBy.push({ netPaid: sortOrder });
    orderBy.push({ createdAt: "desc" });
  } else if (sortBy === "creator") {
    orderBy.push({ User_Expense_createdByToUser: { name: sortOrder } });
    orderBy.push({ createdAt: "desc" });
  } else if (sortBy === "contact") {
    orderBy.push({ Contact: { name: sortOrder } });
    orderBy.push({ createdAt: "desc" });
  } else if (sortBy === "updatedAt") {
    orderBy.push({ updatedAt: sortOrder });
  } else {
    orderBy.push({ billDate: "desc" });
    orderBy.push({ createdAt: "desc" });
  }

  // Base where clause for counting (without tab-specific filters)
  const baseWhereClause = viewMode === "internal"
    ? {
        AND: [
          {
            OR: [
              { internalCompanyId: companyId },
              { companyId: companyId, internalCompanyId: null },
            ],
          },
          {
            OR: [
              { isReimbursement: false },
              { isReimbursement: true, reimbursementStatus: "PAID" as const },
            ],
          },
        ],
        deletedAt: null,
      }
    : {
        companyId,
        deletedAt: null,
        OR: [
          { isReimbursement: false },
          { isReimbursement: true, reimbursementStatus: "PAID" as const },
        ],
      };

  const [expensesRaw, total, tabCounts] = await Promise.all([
    prisma.expense.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Contact: true,
        Account: true,
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
      prisma.expense.count({ where: { ...baseWhereClause, approvalStatus: "PENDING" } }), // pending
      prisma.expense.count({ where: { ...baseWhereClause, approvalStatus: "REJECTED" } }), // rejected
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: { in: ["PAID", "WAITING_TAX_INVOICE", "WHT_PENDING_ISSUE"] } } }), // waiting_doc
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: { in: ["TAX_INVOICE_RECEIVED", "WHT_ISSUED", "WHT_SENT_TO_VENDOR"] } } }), // doc_received
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: "READY_FOR_ACCOUNTING" } }), // ready
      prisma.expense.count({ where: { ...baseWhereClause, workflowStatus: { in: ["SENT_TO_ACCOUNTANT", "COMPLETED"] } } }), // sent
    ]).then(([all, draft, pending, rejected, waiting_doc, doc_received, ready, sent]) => ({
      all,
      draft,
      pending,
      rejected,
      waiting_doc,
      doc_received,
      ready,
      sent,
      recent: null, // Recent doesn't need a count
    })),
  ]);

  // Map Prisma relation names to what the client expects
  const expenses = expensesRaw.map((expense) => {
    const { Contact, Account, Company, InternalCompany, User_Expense_createdByToUser, ...rest } = expense;
    return {
      ...rest,
      contact: Contact,
      account: Account,
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
      viewMode={viewMode as "official" | "internal"}
      currentUserId={currentUserId}
      canApprove={canApprove}
      tabCounts={tabCounts}
    />
  );
}

