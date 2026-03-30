import { Badge } from "@/components/ui/badge";
import { 
  REIMBURSEMENT_STATUS_LABELS, 
  WORKFLOW_STATUS_INFO,
} from "@/lib/constants/transaction";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type: "expense" | "income" | "reimbursement";
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  approvalStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED" | null;
}

const colorMap: Record<string, string> = {
  gray: "bg-muted text-muted-foreground border-border",
  orange:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  amber:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  red: "bg-destructive/10 text-destructive border-destructive/20",
  yellow:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  green: "bg-primary/10 text-primary border-primary/20",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800",
};

export function StatusBadge({ status, type, approvalStatus }: StatusBadgeProps) {
  // Legacy: PENDING_APPROVAL or PENDING approval combo
  if (status === "PENDING_APPROVAL" || (approvalStatus === "PENDING" && status === "DRAFT")) {
    return (
      <Badge
        variant="outline"
        className={colorMap.amber}
      >
        รออนุมัติ
      </Badge>
    );
  }
  
  if (approvalStatus === "REJECTED" && status === "DRAFT") {
    return (
      <Badge
        variant="outline"
        className={colorMap.red}
      >
        ถูกปฏิเสธ
      </Badge>
    );
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

  // Use unified workflow status info for both expense and income
  const workflowInfo = WORKFLOW_STATUS_INFO[status];
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

  return (
    <Badge
      variant="outline"
      className={colorMap.gray}
    >
      {status}
    </Badge>
  );
}
