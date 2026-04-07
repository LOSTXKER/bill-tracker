"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewModeToggle } from "@/components/dashboard/ViewModeToggle";

interface ReportControlsBarProps {
  companyCode: string;
  currentMonth: number;
  currentYear: number;
  currentMode: "official" | "internal";
}

export function ReportControlsBar({
  companyCode,
  currentMonth,
  currentYear,
  currentMode,
}: ReportControlsBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const thisYear = new Date().getFullYear();
  const now = new Date();

  const pushParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) params.set(k, v);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrevMonth = () => {
    const m = currentMonth === 1 ? 12 : currentMonth - 1;
    const y = currentMonth === 1 ? currentYear - 1 : currentYear;
    pushParams({ month: String(m), year: String(y) });
  };

  const handleNextMonth = () => {
    const m = currentMonth === 12 ? 1 : currentMonth + 1;
    const y = currentMonth === 12 ? currentYear + 1 : currentYear;
    pushParams({ month: String(m), year: String(y) });
  };

  const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleDateString("th-TH", {
    month: "long",
  });

  const isCurrentOrFuture =
    currentYear > now.getFullYear() ||
    (currentYear === now.getFullYear() && currentMonth >= now.getMonth() + 1);

  const exportUrl = (type: string) =>
    `/api/reports/export?company=${companyCode.toUpperCase()}&type=${type}&month=${currentMonth}&year=${currentYear}&viewMode=${currentMode}`;

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-2 py-2.5">
        {/* Month Arrow Navigation */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handlePrevMonth}
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center select-none">
            {monthLabel} {currentYear + 543}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleNextMonth}
            disabled={isCurrentOrFuture}
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Year Select */}
        <Select value={currentYear.toString()} onValueChange={(y) => pushParams({ year: y })}>
          <SelectTrigger className="h-8 w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => (
              <SelectItem key={i} value={(thisYear - i).toString()}>
                {thisYear - i + 543}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* ViewMode Toggle */}
        <ViewModeToggle companyCode={companyCode} currentMode={currentMode} />

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">ดาวน์โหลด Excel</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={exportUrl("monthly")}>รายเดือน (ภาพรวม)</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exportUrl("vat")}>VAT (ภ.พ.30)</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exportUrl("wht")}>WHT (ภ.ง.ด.53)</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
