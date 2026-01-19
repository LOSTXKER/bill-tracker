"use client";

import { Badge } from "@/components/ui/badge";
import { APPROVAL_STATUS_INFO } from "@/lib/constants/transaction";
import type { ApprovalStatus } from "@prisma/client";

interface ApprovalBadgeProps {
  status: ApprovalStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

export function ApprovalBadge({
  status,
  showLabel = true,
  size = "md",
  className = "",
}: ApprovalBadgeProps) {
  const info = APPROVAL_STATUS_INFO[status];

  if (!info) {
    return null;
  }

  // Don't show badge for NOT_REQUIRED status
  if (status === "NOT_REQUIRED") {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={`${info.bgColor} ${info.color} ${sizeClasses[size]} ${className} border`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${info.dotColor}`}
      />
      {showLabel && info.label}
    </Badge>
  );
}
