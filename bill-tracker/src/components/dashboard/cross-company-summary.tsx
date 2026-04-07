import { ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { prisma } from "@/lib/db";
import { getCompanyId } from "@/lib/cache/company";
import { reimbursementFilter } from "@/lib/queries/expense-filters";
import { getThaiMonthRange, toThaiLocalDate } from "@/lib/queries/date-utils";
import Link from "next/link";

interface CrossCompanySummaryProps {
  companyCode: string;
}

export async function CrossCompanySummary({ companyCode }: CrossCompanySummaryProps) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const thaiNow = toThaiLocalDate(new Date());
  const { startDate, endDate } = getThaiMonthRange(thaiNow.getFullYear(), thaiNow.getMonth() + 1);

  const [paidForOthers, paidByOthers] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        ...reimbursementFilter,
        companyId: companyId,
        internalCompanyId: { not: companyId },
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        ...reimbursementFilter,
        companyId: { not: companyId },
        internalCompanyId: companyId,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
  ]);

  const paidForOthersAmount = Number(paidForOthers._sum.netPaid) || 0;
  const paidByOthersAmount = Number(paidByOthers._sum.netPaid) || 0;

  if (paidForOthers._count === 0 && paidByOthers._count === 0) {
    return null;
  }

  const parts: string[] = [];
  if (paidForOthers._count > 0) {
    parts.push(`จ่ายแทนบริษัทอื่น ${formatCurrency(paidForOthersAmount)}`);
  }
  if (paidByOthers._count > 0) {
    parts.push(`บริษัทอื่นจ่ายแทน ${formatCurrency(paidByOthersAmount)}`);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5">
      <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="flex-1 text-sm text-foreground">
        <span className="font-medium">ข้ามบริษัทเดือนนี้:</span>{" "}
        {parts.join(" · ")}
      </p>
      <Link
        href={`/${companyCode}/reports/expense-overview`}
        className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline shrink-0"
      >
        ดู
      </Link>
    </div>
  );
}

export function CrossCompanySummarySkeleton() {
  return null;
}
