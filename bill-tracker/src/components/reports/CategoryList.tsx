"use client";

import { useState } from "react";
import { CategoryDrillDownSheet } from "@/components/reports/CategoryDrillDownSheet";
import type { ExpenseRow } from "@/components/reports/CategoryDrillDownSheet";
import { formatCurrency } from "@/lib/utils/tax-calculator";

const EXPENSE_COLORS = [
  "hsl(0 84% 60%)", "hsl(25 95% 53%)", "hsl(43 96% 56%)",
  "hsl(262 80% 58%)", "hsl(198 89% 48%)", "hsl(var(--muted-foreground))",
];
const INCOME_COLORS = [
  "hsl(160 84% 39%)", "hsl(175 80% 40%)", "hsl(190 80% 45%)",
  "hsl(142 71% 45%)", "hsl(84 60% 50%)", "hsl(var(--muted-foreground))",
];

interface CategoryGroup {
  categoryId: string | null;
  categoryName: string;
  total: number;
  count: number;
}

interface CategoryListProps {
  type: "expense" | "income";
  title: string;
  groups: CategoryGroup[];
  total: number;
  allExpenses?: ExpenseRow[];
  companyCode: string;
  year: number;
  month: number;
}

export function CategoryList({
  type,
  title,
  groups,
  total,
  allExpenses,
  companyCode,
  year,
  month,
}: CategoryListProps) {
  const [drillDown, setDrillDown] = useState<CategoryGroup | null>(null);

  const isExpense = type === "expense";
  const colors = isExpense ? EXPENSE_COLORS : INCOME_COLORS;
  const totalCount = groups.reduce((s, g) => s + g.count, 0);

  const filteredExpenses = drillDown && allExpenses
    ? allExpenses.filter((e) =>
        drillDown.categoryId === null
          ? e.categoryName === null
          : e.categoryName === drillDown.categoryName
      )
    : [];

  function handleBarClick(group: CategoryGroup) {
    if (!isExpense) return;
    setDrillDown(group);
  }

  if (groups.length === 0) return null;

  return (
    <>
      <div className="flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {groups.length} หมวดหมู่ · {totalCount} รายการ ·{" "}
            <span className={`font-semibold ${
              isExpense ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {formatCurrency(total)}
            </span>
          </span>
        </div>

        {/* Scrollable bars */}
        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
          {groups.map((group, idx) => {
            const pct = total > 0 ? (group.total / total) * 100 : 0;
            const color = colors[idx % colors.length];
            return (
              <button
                key={group.categoryId ?? "null"}
                className={`w-full text-left group ${isExpense ? "cursor-pointer" : "cursor-default"}`}
                onClick={() => handleBarClick(group)}
                type="button"
              >
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className={`flex-1 min-w-0 truncate text-foreground ${
                    isExpense ? "group-hover:text-foreground" : ""
                  }`}>
                    {group.categoryName}
                  </span>
                  <span className="text-muted-foreground shrink-0">{pct.toFixed(0)}%</span>
                  <span className={`font-semibold tabular-nums shrink-0 ${
                    isExpense ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {formatCurrency(group.total)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drill-down (expense only) */}
      {drillDown && isExpense && (
        <CategoryDrillDownSheet
          open={!!drillDown}
          categoryName={drillDown.categoryName}
          total={drillDown.total}
          categoryId={drillDown.categoryId}
          filteredExpenses={filteredExpenses}
          companyCode={companyCode}
          year={year}
          month={month}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}
