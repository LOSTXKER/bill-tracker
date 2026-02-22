"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      <TooltipProvider>
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
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
                <FileText className="h-4 w-4 mr-1.5" />
                ตามบัญชี
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px]">
              <p className="font-medium">ตามบัญชี (ตามที่ลงบัญชีไว้)</p>
              <p className="text-xs text-muted-foreground mt-1">
                แสดงรายการทั้งหมดที่บันทึกในบริษัทนี้ รวมถึงที่จ่ายแทนบริษัทอื่น
              </p>
              <p className="text-xs text-muted-foreground mt-1 border-t pt-1">
                เช่น Meelike จ่าย Facebook Ads ให้ Anajak → แสดงใน Meelike
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
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
                ตามจริง
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px]">
              <p className="font-medium">ตามจริง (รายการที่เป็นของบริษัทนี้จริงๆ)</p>
              <p className="text-xs text-muted-foreground mt-1">
                แสดงค่าใช้จ่ายที่บริษัทนี้เป็นเจ้าของ ไม่ว่าใครจะเป็นผู้จ่าย
              </p>
              <p className="text-xs text-muted-foreground mt-1 border-t pt-1">
                เช่น Meelike จ่าย Facebook Ads ให้ Anajak → แสดงใน Anajak
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        {currentMode === "internal" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded flex items-center gap-1 cursor-help">
                <Info className="h-3 w-3" />
                มุมมองตามจริง
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px]">
              <p className="text-xs">
                กำลังแสดงค่าใช้จ่ายที่เป็นของบริษัทนี้จริงๆ ไม่ว่าจะจ่ายเองหรือบริษัทอื่นจ่ายแทน
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
