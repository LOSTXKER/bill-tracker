"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import type { ExpenseRow } from "./CategoryDrillDownSheet";

interface IncomeRow {
  id: string;
  receiveDate: string;
  source: string | null;
  amount: number;
  vatAmount: number;
  netReceived: number;
  contactName: string | null;
}

interface MonthlySummaryContentProps {
  companyCode: string;
  year: number;
  month: number;
  allExpenses: ExpenseRow[];
  allIncomes: IncomeRow[];
}

export function MonthlySummaryContent({
  companyCode,
  allExpenses,
  allIncomes,
}: MonthlySummaryContentProps) {
  return (
    <div className="border-t pt-6">
      <h3 className="text-base font-semibold mb-3">
        รายการทั้งหมด
        <span className="text-sm text-muted-foreground font-normal ml-2">
          ({allExpenses.length} รายจ่าย · {allIncomes.length} รายรับ)
        </span>
      </h3>

      <Tabs defaultValue="expenses">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="expenses" className="gap-2 text-xs">
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            รายจ่าย ({allExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="incomes" className="gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            รายรับ ({allIncomes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <div className="rounded-lg border bg-card overflow-hidden">
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
                      <TableHead className="text-muted-foreground font-medium">บริษัทที่จ่าย</TableHead>
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
                          {new Date(expense.billDate).toLocaleDateString("th-TH")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description || "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {expense.contactName || "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {expense.categoryName || "-"}
                        </TableCell>
                        <TableCell>
                          {expense.payerCompanyCode ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-0.5">
                              <ArrowRightLeft className="h-2.5 w-2.5" />
                              {expense.payerCompanyCode} จ่ายแทน
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">จ่ายเอง</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {expense.vatAmount > 0 ? formatCurrency(expense.vatAmount) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(expense.netPaid)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="incomes">
          <div className="rounded-lg border bg-card overflow-hidden">
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
                          {new Date(income.receiveDate).toLocaleDateString("th-TH")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {income.source || "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {income.contactName || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(income.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {income.vatAmount > 0 ? formatCurrency(income.vatAmount) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatCurrency(income.netReceived)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
