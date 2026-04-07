import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/shared/PageHeader";

export default function SettlementTransfersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg ml-auto" />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
