"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STATUS_FLOW, WORKFLOW_STATUS_INFO } from "@/lib/constants/transaction";

const STEPS = WORKFLOW_STATUS_FLOW.map((status) => ({
  status,
  label: WORKFLOW_STATUS_INFO[status]?.label || status,
}));

const STATUS_INDEX = Object.fromEntries(
  STEPS.map((s, i) => [s.status, i])
) as Record<string, number>;

interface WorkflowStepperProps {
  currentStatus: string;
}

export function WorkflowStepper({ currentStatus }: WorkflowStepperProps) {
  const currentIdx = STATUS_INDEX[currentStatus] ?? 0;

  return (
    <div className="flex items-center w-full gap-0 py-3">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full text-xs font-medium transition-colors shrink-0",
                  "h-7 w-7 sm:h-8 sm:w-8",
                  isCompleted && "bg-foreground/80 text-background",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-1 ring-offset-background",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground/60",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs text-center leading-tight max-w-[5rem] truncate",
                  isCurrent && "font-semibold text-foreground",
                  isCompleted && "text-foreground/70",
                  !isCompleted && !isCurrent && "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-1.5 sm:mx-2.5 transition-colors self-start mt-3.5 sm:mt-4",
                  idx < currentIdx ? "bg-foreground/30" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
