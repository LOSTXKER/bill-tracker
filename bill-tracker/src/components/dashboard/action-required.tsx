import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

export async function ActionRequired({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [waitingDocs, waitingWht, waitingIssue] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: company.id, status: "WAITING_FOR_DOC", deletedAt: null },
      orderBy: { billDate: "asc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { companyId: company.id, status: "WAITING_WHT_CERT", deletedAt: null },
      orderBy: { receiveDate: "asc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { companyId: company.id, status: "WAITING_ISSUE", deletedAt: null },
      orderBy: { receiveDate: "asc" },
      take: 5,
    }),
  ]);

  const hasItems =
    waitingDocs.length > 0 || waitingWht.length > 0 || waitingIssue.length > 0;

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          ด่วน! ต้องจัดการ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            ไม่มีรายการที่ต้องจัดการ
          </p>
        ) : (
          <div className="space-y-4">
            {waitingDocs.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  รอใบเสร็จจากร้านค้า ({waitingDocs.length})
                </p>
                <div className="space-y-2">
                  {waitingDocs.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {expense.description || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(expense.netPaid))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
                        รอบิล
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitingWht.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  รอใบ 50 ทวิ จากลูกค้า ({waitingWht.length})
                </p>
                <div className="space-y-2">
                  {waitingWht.map((income) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {income.source || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(income.netReceived))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
                        รอใบ 50 ทวิ
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitingIssue.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  รอออกบิลให้ลูกค้า ({waitingIssue.length})
                </p>
                <div className="space-y-2">
                  {waitingIssue.map((income) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {income.source || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(income.netReceived))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
                        รอออกบิล
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ActionSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
