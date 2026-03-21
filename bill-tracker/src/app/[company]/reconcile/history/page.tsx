import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck2 } from "lucide-react";
import { ReconcileHistoryList } from "@/components/reconcile/ReconcileHistoryList";

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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            ประวัติเทียบรายงานบัญชี
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          ดูประวัติการจับคู่ สถานะการยืนยัน และเอกสารแนบทั้งหมด
        </p>
      </div>

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

  const sessions = await prisma.reconcileSession.findMany({
    where: {
      companyId: company.id,
      year,
      ...(type && { type }),
      ...(status && { status: status as any }),
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
