import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReconcileWorkspace } from "@/components/reconcile/ReconcileWorkspace";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    month?: string;
    year?: string;
    type?: string;
    companies?: string;
  }>;
}

export default async function ReconcileWorkPage({
  params,
  searchParams,
}: WorkPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { company: companyCode } = await params;
  const { month, year, type = "expense", companies } = await searchParams;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const selectedYear = year ? parseInt(year) : currentYear;
  const selectedMonth = month ? parseInt(month) : currentMonth;

  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <WorkspaceDataLoader
        companyCode={companyCode}
        year={selectedYear}
        month={selectedMonth}
        type={type as "expense" | "income"}
        companiesParam={companies}
      />
    </Suspense>
  );
}

async function WorkspaceDataLoader({
  companyCode,
  year,
  month,
  type,
  companiesParam,
}: {
  companyCode: string;
  year: number;
  month: number;
  type: "expense" | "income";
  companiesParam?: string;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });
  if (!company) return null;

  const siblingCompanies = company.taxId
    ? await prisma.company.findMany({
        where: { taxId: company.taxId },
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" },
      })
    : [{ id: company.id, code: company.code, name: company.name }];

  const hasSiblings = siblingCompanies.length > 1;

  const selectedCodes = companiesParam
    ? companiesParam.split(",").map((c) => c.trim().toUpperCase())
    : siblingCompanies.map((c) => c.code);

  const selectedCompanyIds = siblingCompanies
    .filter((c) => selectedCodes.includes(c.code))
    .map((c) => c.id);

  if (selectedCompanyIds.length === 0) {
    selectedCompanyIds.push(company.id);
  }

  const companyIdFilter =
    selectedCompanyIds.length === 1
      ? { companyId: selectedCompanyIds[0] }
      : { companyId: { in: selectedCompanyIds } };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const companyIdToCode = new Map(
    siblingCompanies.map((c) => [c.id, c.code])
  );

  const [expenses, payOnBehalfExpenses, incomes, existingSession] =
    await Promise.all([
      prisma.expense.findMany({
        where: {
          ...companyIdFilter,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: { Contact: true, ExpensePayments: true },
        orderBy: { billDate: "asc" },
      }),
      prisma.expense.findMany({
        where: {
          internalCompanyId: { in: selectedCompanyIds },
          companyId: { notIn: selectedCompanyIds },
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: { Contact: true, Company: { select: { code: true } } },
        orderBy: { billDate: "asc" },
      }),
      prisma.income.findMany({
        where: {
          ...companyIdFilter,
          receiveDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: { Contact: true },
        orderBy: { receiveDate: "asc" },
      }),
      prisma.reconcileSession.findFirst({
        where: {
          companyId: company.id,
          month,
          year,
          type,
        },
        include: {
          AccountingRows: { orderBy: { rowIndex: "asc" } },
          Matches: { orderBy: { createdAt: "asc" } },
        },
      }),
    ]);

  const systemExpenses = [
    ...expenses.map((e) => {
      const paidByUser = e.ExpensePayments?.some(
        (p: any) => p.paidByType === "USER"
      );
      return {
        id: e.id,
        date: e.billDate.toISOString(),
        invoiceNumber: e.invoiceNumber ?? "",
        vendorName: e.Contact?.name ?? e.description ?? "",
        taxId: e.Contact?.taxId ?? "",
        baseAmount: Number(e.amount),
        vatAmount: Number(e.vatAmount ?? 0),
        totalAmount: Number(e.amount) + Number(e.vatAmount ?? 0),
        description: e.description ?? "",
        status: e.workflowStatus,
        companyCode: companyIdToCode.get(e.companyId) ?? "",
        isPayOnBehalf:
          !!e.internalCompanyId && e.internalCompanyId !== e.companyId,
        payOnBehalfFrom:
          e.internalCompanyId && e.internalCompanyId !== e.companyId
            ? companyIdToCode.get(e.companyId) ?? undefined
            : undefined,
        paidByUser,
      };
    }),
    ...payOnBehalfExpenses.map((e) => ({
      id: e.id,
      date: e.billDate.toISOString(),
      invoiceNumber: e.invoiceNumber ?? "",
      vendorName: e.Contact?.name ?? e.description ?? "",
      taxId: e.Contact?.taxId ?? "",
      baseAmount: Number(e.amount),
      vatAmount: Number(e.vatAmount ?? 0),
      totalAmount: Number(e.amount) + Number(e.vatAmount ?? 0),
      description: e.description ?? "",
      status: e.workflowStatus,
      companyCode: (e as any).Company?.code ?? "",
      isPayOnBehalf: true,
      payOnBehalfFrom: (e as any).Company?.code ?? undefined,
      paidByUser: false,
    })),
  ];

  const systemIncomes = incomes.map((i) => ({
    id: i.id,
    date: i.receiveDate.toISOString(),
    invoiceNumber: i.invoiceNumber ?? "",
    vendorName: i.Contact?.name ?? i.source ?? "",
    taxId: i.Contact?.taxId ?? "",
    baseAmount: Number(i.amount),
    vatAmount: Number(i.vatAmount ?? 0),
    totalAmount: Number(i.amount) + Number(i.vatAmount ?? 0),
    description: i.source ?? "",
    status: i.workflowStatus,
    companyCode: companyIdToCode.get(i.companyId) ?? "",
  }));

  const savedAccountingRows = existingSession?.AccountingRows?.map((r) => ({
    date: r.date,
    invoiceNumber: r.invoiceNumber ?? "",
    vendorName: r.vendorName,
    taxId: r.taxId ?? "",
    baseAmount: Number(r.baseAmount),
    vatAmount: Number(r.vatAmount),
    totalAmount: Number(r.totalAmount),
  }));

  const savedMatches = existingSession?.Matches?.map((m) => ({
    id: m.id,
    expenseId: m.expenseId,
    incomeId: m.incomeId,
    systemAmount: Number(m.systemAmount),
    systemVat: Number(m.systemVat),
    systemVendor: m.systemVendor,
    acctDate: m.acctDate,
    acctInvoice: m.acctInvoice,
    acctVendor: m.acctVendor,
    acctTaxId: m.acctTaxId,
    acctBase: Number(m.acctBase),
    acctVat: Number(m.acctVat),
    acctTotal: Number(m.acctTotal),
    matchType: m.matchType,
    confidence: m.confidence ? Number(m.confidence) : undefined,
    aiReason: m.aiReason,
    amountDiff: m.amountDiff ? Number(m.amountDiff) : undefined,
    isPayOnBehalf: m.isPayOnBehalf,
    payOnBehalfFrom: m.payOnBehalfFrom,
    status: m.status,
  }));

  return (
    <ReconcileWorkspace
      companyCode={companyCode}
      year={year}
      month={month}
      type={type}
      systemExpenses={systemExpenses}
      systemIncomes={systemIncomes}
      siblingCompanies={
        hasSiblings
          ? siblingCompanies.map((c) => ({ code: c.code, name: c.name }))
          : undefined
      }
      selectedCompanyCodes={
        hasSiblings
          ? selectedCodes.filter((c) =>
              siblingCompanies.some((s) => s.code === c)
            )
          : undefined
      }
      savedSession={
        existingSession
          ? {
              id: existingSession.id,
              status: existingSession.status,
              sourceFileName: existingSession.sourceFileName,
              sourceFileUrl: existingSession.sourceFileUrl,
              matchedCount: existingSession.matchedCount,
            }
          : undefined
      }
      savedAccountingRows={savedAccountingRows}
      savedMatches={savedMatches}
    />
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
  );
}
