import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileCheck2 } from "lucide-react";
import { ReconcileHistoryList } from "@/components/reconcile/ReconcileHistoryList";
import { ReconcileSessionType } from "@prisma/client";

interface HistoryPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    year?: string;
    type?: string;
    status?: string;
  }>;
}

export default async function ReconcileHistoryPage({
  params,
  searchParams,
}: HistoryPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { company: companyCode } = await params;
  const { year, type, status } = await searchParams;

  const currentYear = new Date().getFullYear();
  const selectedYear = year ? parseInt(year) : currentYear;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ประวัติเทียบรายงานบัญชี"
        description="ดูประวัติการจับคู่และสถานะการยืนยัน"
        icon={FileCheck2}
        breadcrumb={{ label: "เทียบรายงานบัญชี", href: `/${companyCode}/reconcile` }}
      />

      <Suspense fallback={<HistorySkeleton />}>
        <HistoryDataLoader
          companyCode={companyCode}
          year={selectedYear}
          type={type}
          status={status}
        />
      </Suspense>
    </div>
  );
}

async function HistoryDataLoader({
  companyCode,
  year,
  type,
  status,
}: {
  companyCode: string;
  year: number;
  type?: string;
  status?: string;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });
  if (!company) return null;

  const validTypes = Object.values(ReconcileSessionType) as string[];
  const sessionType = type && validTypes.includes(type)
    ? (type as ReconcileSessionType)
    : undefined;

  const sessions = await prisma.reconcileSession.findMany({
    where: {
      companyId: company.id,
      year,
      ...(sessionType && { type: sessionType }),
      ...(status && { status: status as "IN_PROGRESS" | "COMPLETED" }),
    },
    include: {
      _count: { select: { Matches: true } },
    },
    orderBy: [{ month: "desc" }, { type: "asc" }],
  });

  return (
    <ReconcileHistoryList
      sessions={sessions.map((s) => ({
        id: s.id,
        month: s.month,
        year: s.year,
        type: s.type,
        status: s.status,
        matchedCount: s.matchedCount,
        unmatchedSystemCount: s.unmatchedSystemCount,
        unmatchedAccountCount: s.unmatchedAccountCount,
        totalSystemAmount: Number(s.totalSystemAmount),
        totalAccountAmount: Number(s.totalAccountAmount),
        sourceFileName: s.sourceFileName,
        createdBy: s.createdBy,
        createdAt: s.createdAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        completedBy: s.completedBy,
        totalMatches: s._count.Matches,
      }))}
      companyCode={companyCode}
      year={year}
      type={type}
      status={status}
    />
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
