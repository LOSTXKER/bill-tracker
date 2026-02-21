import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReconcileView } from "@/components/reconcile/ReconcileView";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompare } from "lucide-react";

interface ReconcilePageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string; year?: string; type?: string }>;
}

export default async function ReconcilePage({
  params,
  searchParams,
}: ReconcilePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { company: companyCode } = await params;
  const { month, year, type = "expense" } = await searchParams;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const selectedYear = year ? parseInt(year) : currentYear;
  const selectedMonth = month ? parseInt(month) : currentMonth;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            เทียบรายงานบัญชี
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          เปรียบเทียบข้อมูลในระบบกับรายงานภาษีของพนักงานบัญชี — รองรับ Auto-match และ AI ช่วยจับคู่
        </p>
      </div>

      <Suspense fallback={<ReconcileSkeleton />}>
        <ReconcileDataLoader
          companyCode={companyCode}
          year={selectedYear}
          month={selectedMonth}
          type={type as "expense" | "income"}
        />
      </Suspense>
    </div>
  );
}

async function ReconcileDataLoader({
  companyCode,
  year,
  month,
  type,
}: {
  companyCode: string;
  year: number;
  month: number;
  type: "expense" | "income";
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });
  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        companyId: company.id,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: { Contact: true },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: { Contact: true },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  const systemExpenses = expenses.map((e) => ({
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
  }));

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
  }));

  return (
    <ReconcileView
      companyCode={companyCode}
      year={year}
      month={month}
      type={type}
      systemExpenses={systemExpenses}
      systemIncomes={systemIncomes}
    />
  );
}

function ReconcileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[500px] w-full rounded-xl" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    </div>
  );
}
