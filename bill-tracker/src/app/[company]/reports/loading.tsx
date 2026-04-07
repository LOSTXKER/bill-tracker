import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-5">
      {/* PageHeader skeleton */}
      <div className="border-b pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>

      {/* Controls bar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-[120px]" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-[80px] rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* KPI ribbon skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-80 rounded-md" />

      {/* Content area skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
