"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusInfo } from "@/lib/constants/transaction";

interface StatusProgressBarProps {
  statusFlow: readonly string[];
  statusInfo: Record<string, StatusInfo>;
  currentStatus: string;
  className?: string;
}

export function StatusProgressBar({
  statusFlow,
  statusInfo,
  currentStatus,
  className,
}: StatusProgressBarProps) {
  const currentStatusIndex = statusFlow.indexOf(currentStatus);

  return (
    <div className={cn("py-6", className)}>
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div className="absolute top-4 left-8 right-8 h-1 bg-muted rounded-full">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{
              width: `${(currentStatusIndex / (statusFlow.length - 1)) * 100}%`,
            }}
          />
        </div>

        {statusFlow.map((status, index) => {
          const info = statusInfo[status];
          const isActive = index === currentStatusIndex;
          const isPast = index < currentStatusIndex;

          return (
            <div key={status} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 shadow-sm",
                  isPast
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isActive
                    ? "bg-background border-emerald-500 text-emerald-600 scale-110 shadow-emerald-200"
                    : "bg-background border-muted-foreground/20 text-muted-foreground"
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium text-center max-w-[80px] leading-tight",
                  isActive ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                {info?.label || status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
