"use client";

import React from "react";
import { Check, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXPENSE_WORKFLOW_INFO,
  EXPENSE_WORKFLOW_FLOW,
  EXPENSE_WORKFLOW_FLOW_NO_WHT,
  INCOME_WORKFLOW_INFO,
  INCOME_WORKFLOW_FLOW,
  INCOME_WORKFLOW_FLOW_NO_WHT,
  StatusInfo,
} from "@/lib/constants/transaction";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkflowProgressBarProps {
  type: "expense" | "income";
  currentStatus: string;
  isWht?: boolean;
  className?: string;
}

export function WorkflowProgressBar({
  type,
  currentStatus,
  isWht = false,
  className,
}: WorkflowProgressBarProps) {
  // Get flow and info based on type and WHT
  const flow = type === "expense"
    ? (isWht ? EXPENSE_WORKFLOW_FLOW : EXPENSE_WORKFLOW_FLOW_NO_WHT)
    : (isWht ? INCOME_WORKFLOW_FLOW : INCOME_WORKFLOW_FLOW_NO_WHT);
  
  const statusInfo = type === "expense" ? EXPENSE_WORKFLOW_INFO : INCOME_WORKFLOW_INFO;

  // Map current status to flow index
  // Handle intermediate statuses that aren't in the simplified flow
  const getEffectiveIndex = (status: string): number => {
    const directIndex = flow.indexOf(status as any);
    if (directIndex >= 0) return directIndex;

    // Map intermediate statuses
    if (type === "expense") {
      if (status === "WAITING_TAX_INVOICE") return 0; // Still at PAID step
      if (status === "WHT_PENDING_ISSUE") return flow.indexOf("WHT_ISSUED" as any);
      if (status === "COMPLETED") return flow.length - 1;
    } else {
      if (status === "WAITING_INVOICE_ISSUE" || status === "INVOICE_SENT") return flow.indexOf("INVOICE_ISSUED" as any);
      if (status === "WHT_PENDING_CERT") return flow.indexOf("WHT_CERT_RECEIVED" as any) - 1;
      if (status === "NO_INVOICE_NEEDED") return 1;
      if (status === "COMPLETED") return flow.length - 1;
    }
    
    return 0;
  };

  const currentIndex = getEffectiveIndex(currentStatus);
  const currentInfo = statusInfo[currentStatus];

  // Check if current status is a "waiting" state
  const isWaiting = currentStatus.includes("WAITING") || currentStatus.includes("PENDING");

  return (
    <div className={cn("py-6", className)}>
      {/* Current Status Badge */}
      <div className="flex justify-center mb-6">
        <div className={cn(
          "px-4 py-2 rounded-full font-medium text-sm border",
          currentInfo?.bgColor || "bg-muted",
          currentInfo?.color || "text-muted-foreground"
        )}>
          {isWaiting && <AlertCircle className="inline h-4 w-4 mr-1" />}
          {currentInfo?.label || currentStatus}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative flex justify-between">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-8 right-8 h-1 bg-muted rounded-full" />
        
        {/* Progress Line Filled */}
        <div
          className="absolute top-4 left-8 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
          style={{
            width: `calc(${(currentIndex / (flow.length - 1)) * 100}% - ${currentIndex === flow.length - 1 ? 0 : 32}px)`,
          }}
        />

        {/* Steps */}
        <TooltipProvider>
          {flow.map((status, index) => {
            const info = statusInfo[status] as StatusInfo | undefined;
            const isActive = index === currentIndex;
            const isPast = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center relative z-10 cursor-default">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 shadow-sm",
                        isPast
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : isActive
                          ? "bg-background border-emerald-500 text-emerald-600 scale-110 shadow-emerald-200 ring-4 ring-emerald-100 dark:ring-emerald-900/30"
                          : "bg-background border-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      {isPast ? (
                        <Check className="h-4 w-4" />
                      ) : isActive && isWaiting ? (
                        <Circle className="h-3 w-3 fill-current animate-pulse" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-2 font-medium text-center max-w-[80px] leading-tight",
                        isActive ? "text-emerald-600 font-semibold" : isPast ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {info?.label || status}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{info?.description || status}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
