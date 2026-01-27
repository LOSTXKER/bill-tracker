import { Badge } from "@/components/ui/badge";
import { EXPENSE_STATUS_LABELS } from "@/lib/validations/expense";
import { INCOME_STATUS_LABELS } from "@/lib/validations/income";
import { 
  REIMBURSEMENT_STATUS_LABELS, 
  EXPENSE_WORKFLOW_INFO,
  INCOME_WORKFLOW_INFO,
  getExpenseWorkflowLabel,
} from "@/lib/constants/transaction";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type: "expense" | "income" | "reimbursement";
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  approvalStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED" | null;
}

// Legacy color map for backward compatibility
const colorMap: Record<string, string> = {
  gray: "bg-muted text-muted-foreground border-border",
  orange:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  red: "bg-destructive/10 text-destructive border-destructive/20",
  yellow:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  green: "bg-primary/10 text-primary border-primary/20",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
};

/**
 * Reusable status badge component for transactions
 * @param status - The status string (workflowStatus or legacy status)
 * @param type - The transaction type (expense, income, or reimbursement)
 * @param documentType - The document type for expenses (affects label display)
 * @param approvalStatus - The approval status (shows "รออนุมัติ" when PENDING)
 */
export function StatusBadge({ status, type, documentType, approvalStatus }: StatusBadgeProps) {
  // If approval status is PENDING and status is DRAFT, show "รออนุมัติ" badge
  if (approvalStatus === "PENDING" && status === "DRAFT") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
      >
        รออนุมัติ
      </Badge>
    );
  }
  
  // If approval status is REJECTED and status is DRAFT, show "ถูกปฏิเสธ" badge
  if (approvalStatus === "REJECTED" && status === "DRAFT") {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/20"
      >
        ถูกปฏิเสธ
      </Badge>
    );
  }

  // First try new workflow statuses (uses full Tailwind classes)
  if (type === "expense") {
    const workflowInfo = EXPENSE_WORKFLOW_INFO[status];
    if (workflowInfo) {
      // Use document-type aware label for expenses
      const label = getExpenseWorkflowLabel(status, documentType || "TAX_INVOICE");
      return (
        <Badge
          variant="outline"
          className={cn(workflowInfo.bgColor, workflowInfo.color)}
        >
          {label}
        </Badge>
      );
    }
    // Fallback to legacy
    const legacyInfo = EXPENSE_STATUS_LABELS[status];
    if (legacyInfo) {
      return (
        <Badge
          variant="outline"
          className={colorMap[legacyInfo.color] || colorMap.gray}
        >
          {legacyInfo.label}
        </Badge>
      );
    }
  }
  
  if (type === "income") {
    const workflowInfo = INCOME_WORKFLOW_INFO[status];
    if (workflowInfo) {
      return (
        <Badge
          variant="outline"
          className={cn(workflowInfo.bgColor, workflowInfo.color)}
        >
          {workflowInfo.label}
        </Badge>
      );
    }
    // Fallback to legacy
    const legacyInfo = INCOME_STATUS_LABELS[status];
    if (legacyInfo) {
      return (
        <Badge
          variant="outline"
          className={colorMap[legacyInfo.color] || colorMap.gray}
        >
          {legacyInfo.label}
        </Badge>
      );
    }
  }
  
  if (type === "reimbursement") {
    const reimbInfo = REIMBURSEMENT_STATUS_LABELS[status];
    if (reimbInfo) {
      return (
        <Badge
          variant="outline"
          className={colorMap[reimbInfo.color] || colorMap.gray}
        >
          {reimbInfo.label}
        </Badge>
      );
    }
  }

  // Default fallback
  return (
    <Badge
      variant="outline"
      className={colorMap.gray}
    >
      {status}
    </Badge>
  );
}
