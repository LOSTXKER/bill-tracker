"use client";

import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  field: string;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
}

export function SortableHeader({
  field,
  children,
  align = "left",
  sortBy,
  sortOrder,
  onSort,
}: SortableHeaderProps) {
  return (
    <TableHead
      className={cn(
        "text-muted-foreground font-medium",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
    >
      <button
        onClick={() => onSort(field)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          sortBy === field && "text-foreground",
          align === "right" && "ml-auto"
        )}
      >
        {children}
        {sortBy === field ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
