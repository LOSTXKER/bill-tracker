"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportDateSelectorProps {
  companyCode: string;
  currentMonth: number;
  currentYear: number;
}

export function ReportDateSelector({
  companyCode,
  currentMonth,
  currentYear,
}: ReportDateSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const thisYear = new Date().getFullYear();

  const handleMonthChange = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`/${companyCode}/reports?${params.toString()}`);
  };

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`/${companyCode}/reports?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => (
            <SelectItem key={i + 1} value={(i + 1).toString()}>
              {new Date(2000, i).toLocaleDateString("th-TH", { month: "long" })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={currentYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 5 }, (_, i) => (
            <SelectItem key={i} value={(thisYear - i).toString()}>
              {thisYear - i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
