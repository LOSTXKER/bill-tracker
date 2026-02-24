"use client";

import { Building2, FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  TransactionListClient, 
  type CompanyOption,
  TransactionTableRow,
  expenseRowConfig,
} from "@/components/transactions";
import { createTransactionListConfig } from "@/lib/config/transaction-list-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TabCounts {
  all: number;
  draft: number;
  pending: number;
  rejected: number;
  waiting_doc: number;
  doc_received: number;
  ready: number;
  sent: number;
  recent: null;
}

interface ExpensesClientProps {
  companyCode: string;
  initialExpenses: any[];
  initialTotal: number;
  viewMode?: "official" | "internal";
  currentUserId?: string;
  canApprove?: boolean;
  isOwner?: boolean;
  tabCounts?: TabCounts;
  crossCompanyCount?: number;
  companies?: CompanyOption[];
}

const expenseListConfig = createTransactionListConfig(
  "expense",
  (expense, companyCode, selected, onToggle, options) => (
    <TransactionTableRow
      key={expense.id}
      transaction={expense}
      companyCode={companyCode}
      config={expenseRowConfig}
      selected={selected}
      onToggleSelect={onToggle}
      currentUserId={options?.currentUserId}
      canApprove={options?.canApprove}
      onApprovalChange={options?.onRefresh}
      onPreview={options?.onPreview}
    />
  ),
);

export function ExpensesClient({
  companyCode,
  initialExpenses,
  initialTotal,
  viewMode = "internal",
  currentUserId,
  canApprove = false,
  isOwner = false,
  tabCounts,
  crossCompanyCount = 0,
  companies = [],
}: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleViewModeChange = (mode: "official" | "internal") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("viewMode", mode);
    router.push(`/${companyCode}/expenses?${params.toString()}`);
  };
  
  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">มุมมอง:</span>
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewModeChange("official")}
            className={cn(
              "h-8 px-3 rounded-md transition-all",
              viewMode === "official"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            ตามบัญชี
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewModeChange("internal")}
            className={cn(
              "h-8 px-3 rounded-md transition-all",
              viewMode === "internal"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="h-4 w-4 mr-1.5" />
            ตามจริง
          </Button>
        </div>
        {viewMode === "internal" && (
          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded">
            แสดงรายจ่ายที่บริษัทนี้เป็นเจ้าของจริง รวมถึงที่บริษัทอื่นจ่ายแทน
          </span>
        )}
      </div>

      {/* Warning banner: in official mode, warn about cross-company items */}
      {viewMode === "official" && crossCompanyCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span>
              มี <strong>{crossCompanyCount}</strong> รายการที่บริษัทอื่นจ่ายแทน ไม่แสดงในมุมมองนี้
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewModeChange("internal")}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 flex-shrink-0"
          >
            ดูทั้งหมด →
          </Button>
        </div>
      )}

      <TransactionListClient
        companyCode={companyCode}
        data={initialExpenses}
        total={initialTotal}
        config={expenseListConfig}
        companies={companies}
        currentUserId={currentUserId}
        canApprove={canApprove}
        isOwner={isOwner}
        tabCounts={tabCounts}
      />
    </div>
  );
}
