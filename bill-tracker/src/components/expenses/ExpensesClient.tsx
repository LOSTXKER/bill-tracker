"use client";

import { Building2 } from "lucide-react";
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
  active: number;
  ready: number;
  sent: number;
}

interface FilterOptions {
  categories?: Array<{ value: string; label: string }>;
  contacts?: Array<{ id: string; name: string }>;
}

interface ExpensesClientProps {
  companyCode: string;
  initialExpenses: any[];
  initialTotal: number;
  currentUserId?: string;
  canApprove?: boolean;
  isOwner?: boolean;
  tabCounts?: TabCounts;
  crossCompanyCount?: number;
  companies?: CompanyOption[];
  filterOptions?: FilterOptions;
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
  currentUserId,
  canApprove = false,
  isOwner = false,
  tabCounts,
  crossCompanyCount = 0,
  companies = [],
  filterOptions,
}: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ownership = searchParams.get("ownership"); // null | "self" | "payOnBehalf"

  const handleOwnershipChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("ownership", value);
    } else {
      params.delete("ownership");
    }
    params.delete("page");
    router.push(`/${companyCode}/expenses?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {crossCompanyCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">แสดง:</span>
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOwnershipChange(null)}
              className={cn(
                "h-8 px-3 rounded-md transition-all",
                !ownership
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ทั้งหมด
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOwnershipChange("self")}
              className={cn(
                "h-8 px-3 rounded-md transition-all",
                ownership === "self"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              จ่ายเอง
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOwnershipChange("payOnBehalf")}
              className={cn(
                "h-8 px-3 rounded-md transition-all",
                ownership === "payOnBehalf"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-4 w-4 mr-1.5" />
              จ่ายแทน ({crossCompanyCount})
            </Button>
          </div>
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
        filterOptions={filterOptions}
      />
    </div>
  );
}
