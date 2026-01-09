import { Badge } from "@/components/ui/badge";
import { EXPENSE_STATUS_LABELS } from "@/lib/validations/expense";
import { INCOME_STATUS_LABELS } from "@/lib/validations/income";
import { REIMBURSEMENT_STATUS_LABELS } from "@/lib/constants/transaction";

interface StatusBadgeProps {
  status: string;
  type: "expense" | "income" | "reimbursement";
}

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
 * @param status - The status string
 * @param type - The transaction type (expense, income, or reimbursement)
 */
export function StatusBadge({ status, type }: StatusBadgeProps) {
  const labelsMap = {
    expense: EXPENSE_STATUS_LABELS,
    income: INCOME_STATUS_LABELS,
    reimbursement: REIMBURSEMENT_STATUS_LABELS,
  };
  
  const labels = labelsMap[type];
  const statusInfo = labels[status as keyof typeof labels] || {
    label: status,
    color: "gray",
  };

  return (
    <Badge
      variant="outline"
      className={colorMap[statusInfo.color] || colorMap.gray}
    >
      {statusInfo.label}
    </Badge>
  );
}
