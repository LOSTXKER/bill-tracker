"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, X } from "lucide-react";

interface Props {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangeFilter({ dateFrom, dateTo, onChange }: Props) {
  const hasFilter = dateFrom || dateTo;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {hasFilter ? "กรองวันที่" : "วันที่"}
            {hasFilter && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ตั้งแต่</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onChange(e.target.value, dateTo)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ถึง</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onChange(dateFrom, e.target.value)}
              />
            </div>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => onChange("", "")}
              >
                <X className="mr-1 h-3 w-3" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
