"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LucideIcon } from "lucide-react";

export interface MethodOption {
  value: string;
  label: string;
  Icon: LucideIcon;
}

interface MethodDropdownProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: MethodOption[];
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

function resolveOption(
  value: string | null,
  options: MethodOption[],
): MethodOption | null {
  if (!value) return null;
  const exact = options.find((o) => o.value === value);
  if (exact) return exact;
  const upper = value.toUpperCase();
  return options.find((o) => o.value === upper) ?? null;
}

export function MethodDropdown({
  value,
  onValueChange,
  options,
  placeholder = "เลือก...",
  className,
  allowClear = false,
}: MethodDropdownProps) {
  const [open, setOpen] = useState(false);
  const matched = resolveOption(value, options);

  useEffect(() => {
    if (value && matched && matched.value !== value) {
      console.warn(
        `[MethodDropdown] auto-normalizing "${value}" → "${matched.value}"`,
      );
      onValueChange(matched.value);
    }
    if (value && !matched) {
      console.warn(
        `[MethodDropdown] value "${value}" does not match any option:`,
        options.map((o) => o.value),
      );
    }
  }, [value, matched, onValueChange, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 h-9",
            className,
          )}
        >
          {matched ? (
            <span className="flex items-center gap-2 truncate">
              <matched.Icon className="h-3.5 w-3.5 shrink-0" />
              {matched.label}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
      >
        <div className="flex flex-col">
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onValueChange(null);
                setOpen(false);
              }}
              className={cn(
                "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground",
                !value && "bg-accent/50",
              )}
            >
              ไม่ระบุ
              {!value && (
                <span className="absolute right-2 flex size-3.5 items-center justify-center">
                  <Check className="size-4" />
                </span>
              )}
            </button>
          )}
          {options.map((option) => {
            const Icon = option.Icon;
            const isSelected = matched?.value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent/50",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {option.label}
                {isSelected && (
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <Check className="size-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
