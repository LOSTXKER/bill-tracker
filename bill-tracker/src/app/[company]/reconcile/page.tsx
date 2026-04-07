import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReconcileDashboard, type SessionSummary, type ReconcileType } from "@/components/reconcile/ReconcileDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompare } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

interface ReconcilePageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ year?: string; type?: string }>;
}

export default async function ReconcilePage({
  params,
  searchParams,
}: ReconcilePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { company: companyCode } = await params;
  const { year, type = "EXPENSE" } = await searchParams;

  const currentYear = new Date().getFullYear();
  const selectedYear = year ? parseInt(year) : currentYear;

  return (
    <div className="space-y-6">
      <PageHeader
        title="เทียบรายงานบัญชี"
        description="เลือกเดือนที่ต้องการเทียบรายงาน"
        icon={GitCompare}
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardLoader
          companyCode={companyCode}
          year={selectedYear}
          type={type as ReconcileType}
        />
      </Suspense>
    </div>
  );
}

async function DashboardLoader({
  companyCode,
  year,
  type,
}: {
  companyCode: string;
  year: number;
  type: ReconcileType;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });
  if (!company) return null;

  const sessions = await prisma.reconcileSession.findMany({
    where: {
      companyId: company.id,
      year,
    },
    include: {
      _count: { select: { Matches: true, AccountingRows: true } },
    },
    orderBy: [{ month: "asc" }, { type: "asc" }],
  });

  const sessionData: SessionSummary[] = sessions.map((s) => ({
    id: s.id,
    month: s.month,
    year: s.year,
    type: s.type,
    status: s.status,
    matchedCount: s.matchedCount,
    unmatchedSystemCount: s.unmatchedSystemCount,
    unmatchedAccountCount: s.unmatchedAccountCount,
    totalSystemAmount: String(s.totalSystemAmount),
    totalAccountAmount: String(s.totalAccountAmount),
    sourceFileName: s.sourceFileName,
    sourceFileUrl: s.sourceFileUrl,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
    _count: s._count,
  }));

  return (
    <ReconcileDashboard
      companyCode={companyCode}
      year={year}
      type={type}
      sessions={sessionData}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
