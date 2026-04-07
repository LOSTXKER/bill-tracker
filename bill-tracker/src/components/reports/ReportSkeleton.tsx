import { Skeleton } from "@/components/ui/skeleton";

export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Trend chart skeleton */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4 border-b">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-5">
          <Skeleton className="h-[240px] w-full rounded" />
        </div>
      </div>

      {/* Category breakdown skeleton — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t pt-6">
        {[1, 2].map((col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
