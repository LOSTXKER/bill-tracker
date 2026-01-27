"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewModeToggleProps {
  companyCode: string;
  currentMode?: "official" | "internal";
}

export function ViewModeToggle({ companyCode, currentMode = "official" }: ViewModeToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const handleViewModeChange = (mode: "official" | "internal") => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "official") {
      params.delete("viewMode"); // official is default
    } else {
      params.set("viewMode", mode);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">มุมมอง:</span>
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange("official")}
          className={cn(
            "h-8 px-3 rounded-md transition-all",
            currentMode === "official"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          ตามที่บันทึก
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange("internal")}
          className={cn(
            "h-8 px-3 rounded-md transition-all",
            currentMode === "internal"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4 mr-1.5" />
          ตามบริษัทจริง
        </Button>
      </div>
      {currentMode === "internal" && (
        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded">
          แสดงข้อมูลภายใน
        </span>
      )}
    </div>
  );
}
