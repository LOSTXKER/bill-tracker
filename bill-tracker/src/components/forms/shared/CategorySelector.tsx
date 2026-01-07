"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { CategorySummary } from "@/types";

interface CategorySelectorProps {
  categories: CategorySummary[];
  isLoading: boolean;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  label?: string;
  placeholder?: string;
}

export function CategorySelector({
  categories,
  isLoading,
  selectedCategory,
  onSelect,
  label = "หมวดหมู่",
  placeholder = "เลือกหมวดหมู่",
}: CategorySelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">{label}</Label>
      <Select
        value={selectedCategory || undefined}
        onValueChange={onSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
          <SelectValue placeholder={isLoading ? "กำลังโหลด..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
