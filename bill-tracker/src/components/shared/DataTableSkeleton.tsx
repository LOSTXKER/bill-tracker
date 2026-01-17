"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  title?: string;
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  showPagination?: boolean;
}

export function DataTableSkeleton({
  title,
  columns = 5,
  rows = 5,
  showHeader = true,
  showPagination = false,
}: DataTableSkeletonProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            {title ? (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      )}

      {/* Table Header */}
      <div className="border-b">
        <div className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-5"
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      )}
    </div>
  );
}
