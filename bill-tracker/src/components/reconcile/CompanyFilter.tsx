"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { SiblingCompany } from "./reconcile-types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface CompanyFilterProps {
  siblingCompanies: SiblingCompany[];
  selectedCompanyCodes?: string[];
  router: AppRouterInstance;
}

export function CompanyFilter({
  siblingCompanies,
  selectedCompanyCodes,
  router,
}: CompanyFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs flex-shrink-0"
        >
          <Building2 className="h-3.5 w-3.5" />
          {selectedCompanyCodes &&
          selectedCompanyCodes.length < siblingCompanies.length
            ? `${selectedCompanyCodes.length} บริษัท`
            : "ทุกบริษัท"}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-2">
          นิติบุคคลเดียวกัน (Tax ID)
        </p>
        <div className="space-y-1">
          {siblingCompanies.map((sc) => {
            const isChecked = selectedCompanyCodes
              ? selectedCompanyCodes.includes(sc.code)
              : true;
            return (
              <label
                key={sc.code}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const current =
                      selectedCompanyCodes ??
                      siblingCompanies.map((s) => s.code);
                    const next = checked
                      ? [...new Set([...current, sc.code])]
                      : current.filter((c) => c !== sc.code);
                    if (next.length === 0) return;
                    const params = new URLSearchParams(
                      window.location.search
                    );
                    if (next.length === siblingCompanies.length) {
                      params.delete("companies");
                    } else {
                      params.set("companies", next.join(","));
                    }
                    router.push(`?${params.toString()}`);
                  }}
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 h-4 font-mono flex-shrink-0"
                  >
                    {sc.code}
                  </Badge>
                  <span className="text-sm truncate">{sc.name}</span>
                </div>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
