"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/tax-calculator";

export interface ExpenseRow {
  id: string;
  billDate: string;
  description: string | null;
  amount: number;
  vatAmount: number;
  netPaid: number;
  contactName: string | null;
  categoryName: string | null;
}

interface CategoryDrillDownSheetProps {
  open: boolean;
  categoryName: string;
  total: number;
  categoryId: string | null;
  filteredExpenses: ExpenseRow[];
  companyCode: string;
  year: number;
  month: number;
  onClose: () => void;
}

export function CategoryDrillDownSheet({
  open,
  categoryName,
  total,
  categoryId,
  filteredExpenses,
  companyCode,
  year,
  month,
  onClose,
}: CategoryDrillDownSheetProps) {
  const lastDay = new Date(year, month, 0).getDate();
  const dateFromStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateToStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-base">{categoryName}</SheetTitle>
          <SheetDescription className="flex items-center gap-3">
            <span>{filteredExpenses.length} รายการ</span>
            <span>·</span>
            <span className="font-medium text-red-600">{formatCurrency(total)}</span>
            <Link
              href={`/${companyCode}/expenses?dateFrom=${dateFromStr}&dateTo=${dateToStr}${categoryId ? `&category=${categoryId}` : ""}`}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              ดูในหน้ารายการ
              <ExternalLink className="h-3 w-3" />
            </Link>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {filteredExpenses.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              ไม่มีรายการ
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium pl-6">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">รายละเอียด</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ขาย</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right pr-6">สุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="group relative hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap pl-6">
                      <Link
                        href={`/${companyCode}/expenses/${expense.id}`}
                        className="absolute inset-0"
                        tabIndex={-1}
                        onClick={onClose}
                      />
                      {new Date(expense.billDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate">{expense.description || "-"}</div>
                      {expense.vatAmount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          VAT {formatCurrency(expense.vatAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-muted-foreground text-sm">
                      {expense.contactName || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 pr-6">
                      {formatCurrency(expense.netPaid)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {filteredExpenses.length > 0 && (
          <div className="shrink-0 border-t px-6 py-3 flex justify-between items-center bg-muted/30">
            <span className="text-xs text-muted-foreground">รวม {filteredExpenses.length} รายการ</span>
            <span className="text-sm font-semibold text-red-600">
              {formatCurrency(filteredExpenses.reduce((s, e) => s + e.netPaid, 0))}
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
