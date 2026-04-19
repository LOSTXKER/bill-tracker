import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
  Receipt,
  FileCheck,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { getCompanyId } from "@/lib/cache/company";
import { reimbursementFilter, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";

interface TaskRow {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
  colorClass: string;
}

export async function TasksSidebar({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const [waitingDocs, waitingWht, waitingIssue, whtPendingIssue, readyExpenses, readyIncomes] =
    await Promise.all([
      prisma.expense.count({
        where: {
          ...reimbursementFilter,
          companyId,
          workflowStatus: "ACTIVE",
          hasTaxInvoice: false,
          documentType: { not: "NO_DOCUMENT" },
          deletedAt: null,
        },
      }),
      prisma.income.count({
        where: {
          ...buildIncomeBaseWhere(companyId),
          workflowStatus: "ACTIVE",
          isWhtDeducted: true,
          hasWhtCert: false,
        },
      }),
      prisma.income.count({
        where: {
          ...buildIncomeBaseWhere(companyId),
          workflowStatus: "ACTIVE",
          hasInvoice: false,
        },
      }),
      prisma.expense.count({
        where: {
          ...reimbursementFilter,
          companyId,
          workflowStatus: "ACTIVE",
          isWht: true,
          hasWhtCert: false,
          deletedAt: null,
        },
      }),
      prisma.expense.count({
        where: {
          ...reimbursementFilter,
          companyId,
          workflowStatus: "READY_FOR_ACCOUNTING",
          deletedAt: null,
        },
      }),
      prisma.income.count({
        where: {
          ...buildIncomeBaseWhere(companyId),
          workflowStatus: "READY_FOR_ACCOUNTING",
        },
      }),
    ]);

  const tasks: TaskRow[] = [
    {
      icon: <FileText className="h-4 w-4" />,
      label: "รอเอกสารจากร้านค้า",
      count: waitingDocs,
      href: `/${companyCode}/tax-invoice-follow-ups`,
      colorClass: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: <Receipt className="h-4 w-4" />,
      label: "รอใบ 50 ทวิ จากลูกค้า",
      count: waitingWht,
      href: `/${companyCode}/wht-deliveries?stage=incoming-wait`,
      colorClass: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "รอออกบิลให้ลูกค้า",
      count: waitingIssue,
      href: `/${companyCode}/incomes`,
      colorClass: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: <Receipt className="h-4 w-4" />,
      label: "รอออกใบ 50 ทวิ",
      count: whtPendingIssue,
      href: `/${companyCode}/wht-deliveries?stage=pending-issue`,
      colorClass: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: <FileCheck className="h-4 w-4" />,
      label: "รอส่งบัญชี",
      count: readyExpenses + readyIncomes,
      href: `/${companyCode}/approvals`,
      colorClass: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  const activeTasks = tasks.filter((t) => t.count > 0);
  const totalCount = tasks.reduce((sum, t) => sum + t.count, 0);

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <ClipboardList className="h-4 w-4 text-destructive" />
            </div>
            งานที่ต้องจัดการ
          </div>
          {totalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <p className="text-sm">ไม่มีงานค้าง</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activeTasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
              >
                <span className={task.colorClass}>{task.icon}</span>
                <span className="flex-1 text-sm text-foreground">
                  {task.label}
                </span>
                <Badge variant="secondary" className="text-xs font-medium">
                  {task.count}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TasksSidebarSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
