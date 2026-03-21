import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck2 } from "lucide-react";
import { ReconcileSessionDetail } from "@/components/reconcile/ReconcileSessionDetail";

interface DetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

export default async function ReconcileSessionDetailPage({
  params,
}: DetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { company: companyCode, id } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<DetailSkeleton />}>
        <SessionDataLoader companyCode={companyCode} sessionId={id} />
      </Suspense>
    </div>
  );
}

async function SessionDataLoader({
  companyCode,
  sessionId,
}: {
  companyCode: string;
  sessionId: string;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });
  if (!company) return notFound();

  const reconcileSession = await prisma.reconcileSession.findFirst({
    where: { id: sessionId, companyId: company.id },
    include: {
      Matches: {
        orderBy: { createdAt: "asc" },
        include: {
          Expense: {
            select: {
              id: true,
              description: true,
              invoiceNumber: true,
              billDate: true,
              amount: true,
              vatAmount: true,
              contactName: true,
              slipUrls: true,
              taxInvoiceUrls: true,
              whtCertUrls: true,
              otherDocUrls: true,
              internalCompanyId: true,
            },
          },
          Income: {
            select: {
              id: true,
              source: true,
              invoiceNumber: true,
              receiveDate: true,
              amount: true,
              vatAmount: true,
              contactName: true,
              customerSlipUrls: true,
              myBillCopyUrls: true,
              whtCertUrls: true,
              otherDocUrls: true,
            },
          },
        },
      },
    },
  });

  if (!reconcileSession) return notFound();

  const matches = reconcileSession.Matches.map((m) => {
    const docUrls: string[] = [];
    if (m.Expense) {
      for (const field of [
        m.Expense.taxInvoiceUrls,
        m.Expense.slipUrls,
        m.Expense.whtCertUrls,
        m.Expense.otherDocUrls,
      ]) {
        try {
          const arr = typeof field === "string" ? JSON.parse(field) : field;
          if (Array.isArray(arr)) docUrls.push(...arr.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http")));
        } catch { /* ignore */ }
      }
    }
    if (m.Income) {
      for (const field of [
        m.Income.customerSlipUrls,
        m.Income.myBillCopyUrls,
        m.Income.whtCertUrls,
        m.Income.otherDocUrls,
      ]) {
        try {
          const arr = typeof field === "string" ? JSON.parse(field) : field;
          if (Array.isArray(arr)) docUrls.push(...arr.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http")));
        } catch { /* ignore */ }
      }
    }

    return {
      id: m.id,
      systemVendor: m.systemVendor,
      systemAmount: Number(m.systemAmount),
      systemVat: Number(m.systemVat),
      acctVendor: m.acctVendor,
      acctDate: m.acctDate,
      acctInvoice: m.acctInvoice,
      acctTaxId: m.acctTaxId,
      acctBase: Number(m.acctBase),
      acctVat: Number(m.acctVat),
      acctTotal: Number(m.acctTotal),
      matchType: m.matchType,
      confidence: m.confidence ? Number(m.confidence) : null,
      aiReason: m.aiReason,
      amountDiff: m.amountDiff ? Number(m.amountDiff) : null,
      notes: m.notes,
      isPayOnBehalf: m.isPayOnBehalf,
      payOnBehalfFrom: m.payOnBehalfFrom,
      payOnBehalfTo: m.payOnBehalfTo ?? null,
      status: m.status,
      confirmedBy: m.confirmedBy,
      confirmedAt: m.confirmedAt?.toISOString() ?? null,
      rejectedReason: m.rejectedReason,
      documentUrls: docUrls,
      expenseDescription: m.Expense?.description ?? m.Income?.source ?? null,
      expenseDate: m.Expense?.billDate?.toISOString() ?? m.Income?.receiveDate?.toISOString() ?? null,
    };
  });

  return (
    <ReconcileSessionDetail
      session={{
        id: reconcileSession.id,
        month: reconcileSession.month,
        year: reconcileSession.year,
        type: reconcileSession.type,
        status: reconcileSession.status,
        matchedCount: reconcileSession.matchedCount,
        unmatchedSystemCount: reconcileSession.unmatchedSystemCount,
        unmatchedAccountCount: reconcileSession.unmatchedAccountCount,
        totalSystemAmount: Number(reconcileSession.totalSystemAmount),
        totalAccountAmount: Number(reconcileSession.totalAccountAmount),
        sourceFileName: reconcileSession.sourceFileName,
        createdBy: reconcileSession.createdBy,
        createdAt: reconcileSession.createdAt.toISOString(),
        completedAt: reconcileSession.completedAt?.toISOString() ?? null,
        completedBy: reconcileSession.completedBy,
      }}
      matches={matches}
      companyCode={companyCode}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
