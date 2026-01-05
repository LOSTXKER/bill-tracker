"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionDetailSkeletonProps {
  className?: string;
}

export function TransactionDetailSkeleton({ className }: TransactionDetailSkeletonProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Status Progress Bar */}
      <Skeleton className="h-24 w-full rounded-xl" />

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-2">
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
