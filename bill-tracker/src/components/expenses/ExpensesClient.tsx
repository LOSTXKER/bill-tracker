"use client";

import { ArrowUpCircle, Building2, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  TransactionListClient, 
  type TransactionListConfig,
  TransactionTableRow,
  expenseRowConfig,
} from "@/components/transactions";
import { EXPENSE_WORKFLOW_INFO } from "@/lib/constants/transaction";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpensesClientProps {
  companyCode: string;
  initialExpenses: any[];
  initialTotal: number;
  viewMode?: "official" | "internal";
}

// Expense-specific configuration
const expenseListConfig: TransactionListConfig = {
  type: "expense",
  title: "รายการรายจ่าย",
  emptyStateTitle: "ยังไม่มีรายจ่าย",
  emptyIcon: ArrowUpCircle,
  apiEndpoint: "/api/expenses",
  captureUrl: "capture",
  dateField: "billDate",
  statusInfo: EXPENSE_WORKFLOW_INFO,
  
  tableHeaders: [
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
    { key: "billDate", label: "วันที่บิล", sortable: true },
    { key: "status", label: "สถานะ", align: "center" },
    { key: "contact", label: "ผู้ติดต่อ", sortable: true },
    { key: "category", label: "บัญชี" },
    { key: "description", label: "รายละเอียด" },
    { key: "creator", label: "ผู้สร้าง", sortable: true },
    { key: "amount", label: "จำนวนเงิน", sortable: true, align: "right" },
    { key: "updatedAt", label: "แก้ไขล่าสุด", sortable: true },
    { key: "wht", label: "หัก ณ ที่จ่าย", align: "center" },
    { key: "line", label: "LINE", align: "center" },
  ],
  
  showCategory: true,
  
  renderRow: (expense, companyCode, selected, onToggle) => (
    <TransactionTableRow
      key={expense.id}
      transaction={expense}
      companyCode={companyCode}
      config={expenseRowConfig}
      selected={selected}
      onToggleSelect={onToggle}
    />
  ),
};

export function ExpensesClient({
  companyCode,
  initialExpenses,
  initialTotal,
  viewMode = "official",
}: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleViewModeChange = (mode: "official" | "internal") => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "official") {
      params.delete("viewMode"); // official is default
    } else {
      params.set("viewMode", mode);
    }
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
            <Eye className="h-4 w-4 mr-1.5" />
            ตามที่บันทึก
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
            ตามบริษัทจริง
          </Button>
        </div>
        {viewMode === "internal" && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            แสดงรายจ่ายที่บริษัทนี้เป็นเจ้าของจริง (ถูกบันทึกไว้ในบริษัทอื่น)
          </span>
        )}
      </div>
      
      <TransactionListClient
        companyCode={companyCode}
        data={initialExpenses}
        total={initialTotal}
        config={expenseListConfig}
      />
    </div>
  );
}
