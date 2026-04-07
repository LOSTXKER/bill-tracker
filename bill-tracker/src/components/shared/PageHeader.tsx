import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  breadcrumb?: { label: string; href: string };
}

export function PageHeader({ title, description, actions, icon: Icon, breadcrumb }: PageHeaderProps) {
  return (
    <div className="border-b pb-4">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="mt-1 flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
              <Icon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton({ hasActions = false }: { hasActions?: boolean }) {
  return (
    <div className="border-b pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 h-8 w-8 rounded-lg shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        {hasActions && (
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-9 w-28" />
          </div>
        )}
      </div>
    </div>
  );
}
