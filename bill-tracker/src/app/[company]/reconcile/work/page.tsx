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
        type={type as "expense" | "income" | "pp36"}
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
  type: "expense" | "income" | "pp36";
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

  // Previous month range for spillover (cross-month) items
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const spilloverStart = new Date(prevYear, prevMonth - 1, 1);
  const spilloverEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  const companyIdToCode = new Map(
    siblingCompanies.map((c) => [c.id, c.code])
  );

  const isForeignOnly = type === "pp36";

  const [
    expenses,
    payOnBehalfExpenses,
    incomes,
    existingSession,
    spilloverExpenses,
    spilloverPayOnBehalf,
    spilloverIncomes,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...companyIdFilter,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
        ...(isForeignOnly
          ? { originalCurrency: { not: null, notIn: ["THB", ""] } }
          : {}),
      },
      include: { Contact: true, ExpensePayments: true },
      orderBy: { billDate: "asc" },
    }),
    isForeignOnly
      ? Promise.resolve([])
      : prisma.expense.findMany({
          where: {
            internalCompanyId: { in: selectedCompanyIds },
            companyId: { notIn: selectedCompanyIds },
            billDate: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          include: { Contact: true, Company: { select: { code: true } } },
          orderBy: { billDate: "asc" },
        }),
    isForeignOnly
      ? Promise.resolve([])
      : prisma.income.findMany({
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
    // Spillover: previous month expenses not yet matched in any session
    prisma.expense.findMany({
      where: {
        ...companyIdFilter,
        billDate: { gte: spilloverStart, lte: spilloverEnd },
        deletedAt: null,
        ReconcileMatches: { none: {} },
        ...(isForeignOnly
          ? { originalCurrency: { not: null, notIn: ["THB", ""] } }
          : {}),
      },
      include: { Contact: true, ExpensePayments: true },
      orderBy: { billDate: "asc" },
    }),
    isForeignOnly
      ? Promise.resolve([])
      : prisma.expense.findMany({
          where: {
            internalCompanyId: { in: selectedCompanyIds },
            companyId: { notIn: selectedCompanyIds },
            billDate: { gte: spilloverStart, lte: spilloverEnd },
            deletedAt: null,
            ReconcileMatches: { none: {} },
          },
          include: { Contact: true, Company: { select: { code: true } } },
          orderBy: { billDate: "asc" },
        }),
    isForeignOnly
      ? Promise.resolve([])
      : prisma.income.findMany({
          where: {
            ...companyIdFilter,
            receiveDate: { gte: spilloverStart, lte: spilloverEnd },
            deletedAt: null,
            ReconcileMatches: { none: {} },
          },
          include: { Contact: true },
          orderBy: { receiveDate: "asc" },
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
        payOnBehalfTo:
          e.internalCompanyId && e.internalCompanyId !== e.companyId
            ? companyIdToCode.get(e.internalCompanyId) ?? undefined
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
      payOnBehalfTo: e.internalCompanyId ? companyIdToCode.get(e.internalCompanyId) ?? undefined : undefined,
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

  // Spillover items from previous month (not yet matched anywhere)
  const spilloverSystemExpenses = [
    ...spilloverExpenses.map((e) => {
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
        payOnBehalfTo:
          e.internalCompanyId && e.internalCompanyId !== e.companyId
            ? companyIdToCode.get(e.internalCompanyId) ?? undefined
            : undefined,
        paidByUser,
        fromMonth: prevMonth,
      };
    }),
    ...spilloverPayOnBehalf.map((e) => ({
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
      payOnBehalfTo: e.internalCompanyId ? companyIdToCode.get(e.internalCompanyId) ?? undefined : undefined,
      paidByUser: false,
      fromMonth: prevMonth,
    })),
  ];

  const spilloverSystemIncomes = spilloverIncomes.map((i) => ({
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
    fromMonth: prevMonth,
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
    payOnBehalfTo: m.payOnBehalfTo ?? null,
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
      spilloverExpenses={spilloverSystemExpenses}
      spilloverIncomes={spilloverSystemIncomes}
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
