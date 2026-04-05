import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

type ViewMode = "official" | "internal";

interface MonthlySummaryProps {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}

export async function MonthlySummary({
  companyCode,
  year,
  month,
  viewMode = "official",
}: MonthlySummaryProps) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const expenseCompanyFilter =
    viewMode === "internal"
      ? {
          OR: [
            { internalCompanyId: company.id },
            { companyId: company.id, internalCompanyId: null },
          ],
        }
      : { companyId: company.id };

  const [expenseSum, incomeSum, expenseByCategory, categories, allExpenses, allIncomes] =
    await Promise.all([
      prisma.expense.aggregate({
        where: {
          ...expenseCompanyFilter,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netPaid: true },
        _count: true,
      }),
      prisma.income.aggregate({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netReceived: true },
        _count: true,
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: {
          ...expenseCompanyFilter,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netPaid: true },
        _count: true,
      }),
      prisma.transactionCategory.findMany({
        where: { companyId: company.id, parentId: { not: null } },
        select: { id: true, name: true, Parent: { select: { name: true } } },
      }),
      prisma.expense.findMany({
        where: {
          ...expenseCompanyFilter,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: { Contact: true, Category: { include: { Parent: { select: { name: true } } } } },
        orderBy: { billDate: "desc" },
      }),
      prisma.income.findMany({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        include: { Contact: true },
        orderBy: { receiveDate: "desc" },
      }),
    ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const totalExpense = Number(expenseSum._sum.netPaid) || 0;
  const totalIncome = Number(incomeSum._sum.netReceived) || 0;
  const netCashFlow = totalIncome - totalExpense;

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "ไม่ระบุหมวดหมู่";
    const cat = categoryMap.get(categoryId);
    return cat ? (cat.Parent ? `[${cat.Parent.name}] ${cat.name}` : cat.name) : "ไม่ระบุหมวดหมู่";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">รายรับรวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">{incomeSum._count} รายการ</p>
          </CardContent>
        </Card>

        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">รายจ่ายรวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{expenseSum._count} รายการ</p>
          </CardContent>
        </Card>

        <Card
          className={
            netCashFlow >= 0
              ? "border-blue-200/50 dark:border-blue-800/50"
              : "border-red-200/50 dark:border-red-800/50"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              กระแสเงินสดสุทธิ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netCashFlow >= 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(netCashFlow)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Expense by Category */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">รายจ่ายแยกตามหมวดหมู่</h3>
        </div>
        <CardContent className="pt-4">
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ไม่มีรายการในเดือนนี้</p>
          ) : (
            <div className="space-y-4">
              {expenseByCategory
                .sort((a, b) => (Number(b._sum?.netPaid) || 0) - (Number(a._sum?.netPaid) || 0))
                .map((item) => {
                  const amount = Number(item._sum?.netPaid) || 0;
                  const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                  return (
                    <div key={item.categoryId || "null"} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{getCategoryName(item.categoryId)}</span>
                        <span>{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item._count} รายการ</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </div>

      {/* All Expenses Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-foreground">รายจ่ายทั้งหมด</h3>
          <span className="text-xs text-muted-foreground">({allExpenses.length} รายการ)</span>
        </div>
        {allExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">รายละเอียด</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ขาย</TableHead>
                  <TableHead className="text-muted-foreground font-medium">หมวดหมู่</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอดเงิน</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">VAT</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">สุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="group relative hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/${companyCode}/expenses/${expense.id}`}
                        className="absolute inset-0"
                        tabIndex={-1}
                      />
                      {expense.billDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description || "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {expense.Contact?.name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {expense.Category
                        ? expense.Category.Parent
                          ? `[${expense.Category.Parent.name}] ${expense.Category.name}`
                          : expense.Category.name
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(expense.vatAmount) > 0
                        ? formatCurrency(Number(expense.vatAmount))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(Number(expense.netPaid))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* All Incomes Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-semibold text-foreground">รายรับทั้งหมด</h3>
          <span className="text-xs text-muted-foreground">({allIncomes.length} รายการ)</span>
        </div>
        {allIncomes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">รายละเอียด</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ลูกค้า</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอดเงิน</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">VAT</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">สุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allIncomes.map((income) => (
                  <TableRow
                    key={income.id}
                    className="group relative hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/${companyCode}/incomes/${income.id}`}
                        className="absolute inset-0"
                        tabIndex={-1}
                      />
                      {income.receiveDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{income.source || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {income.Contact?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(income.vatAmount) > 0
                        ? formatCurrency(Number(income.vatAmount))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(Number(income.netReceived))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
