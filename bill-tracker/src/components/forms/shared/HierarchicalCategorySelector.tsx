"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronRight, Plus } from "lucide-react";
import type { CategorySummary, CategoryWithChildren } from "@/types";
import { CreateCategoryDialog } from "./CreateCategoryDialog";

interface HierarchicalCategorySelectorProps {
  categories: CategorySummary[];
  isLoading: boolean;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  label?: string;
  placeholder?: string;
  // For creating new category
  companyCode?: string;
  categoryType?: "EXPENSE" | "INCOME";
  onCategoryCreated?: (category: CategorySummary) => void;
  allowCreate?: boolean;
}

// สร้าง tree structure จาก flat list
function buildCategoryTree(categories: CategorySummary[]): CategoryWithChildren[] {
  // แยก groups (parentId = null) และ children
  const groups = categories.filter((c) => !c.parentId && c.isActive);
  const children = categories.filter((c) => c.parentId && c.isActive);

  // สร้าง map สำหรับหา children ของแต่ละ group
  const childrenByParent = new Map<string, CategorySummary[]>();
  for (const child of children) {
    if (!childrenByParent.has(child.parentId!)) {
      childrenByParent.set(child.parentId!, []);
    }
    childrenByParent.get(child.parentId!)!.push(child);
  }

  // Build tree
  return groups
    .map((group) => ({
      ...group,
      children: (childrenByParent.get(group.id) || []).sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      ),
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

// หาชื่อเต็มของหมวดหมู่ (กลุ่ม → หมวดย่อย)
function getFullCategoryName(
  categoryId: string,
  categories: CategorySummary[],
  tree: CategoryWithChildren[]
): string {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return "";

  if (!category.parentId) {
    // This is a group
    return category.name;
  }

  // Find parent group
  const parentGroup = tree.find((g) => g.id === category.parentId);
  if (parentGroup) {
    return `${parentGroup.name} › ${category.name}`;
  }

  return category.name;
}

export function HierarchicalCategorySelector({
  categories,
  isLoading,
  selectedCategory,
  onSelect,
  label = "หมวดหมู่",
  placeholder = "เลือกหมวดหมู่",
  companyCode,
  categoryType,
  onCategoryCreated,
  allowCreate = true,
}: HierarchicalCategorySelectorProps) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCategoryCreated = (newCategory: CategorySummary) => {
    onCategoryCreated?.(newCategory);
    onSelect(newCategory.id);
  };

  // Get display value for selected category
  const displayValue = useMemo(() => {
    if (!selectedCategory) return placeholder;
    return getFullCategoryName(selectedCategory, categories, tree);
  }, [selectedCategory, categories, tree, placeholder]);

  // ถ้าไม่มี groups ให้แสดงแบบ flat list (backward compatible)
  if (tree.length === 0 && categories.length > 0) {
    // No hierarchy, show flat list
    const activeCategories = categories.filter((c) => c.isActive);
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
            {activeCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle value change - check for create new option
  const handleValueChange = (value: string) => {
    if (value === "__create_new__") {
      // Open create dialog instead of selecting
      setShowCreateDialog(true);
    } else {
      onSelect(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">{label}</Label>
      <Select
        value={selectedCategory || undefined}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
          <SelectValue placeholder={isLoading ? "กำลังโหลด..." : placeholder}>
            {displayValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {/* Create new category option - at top */}
          {allowCreate && companyCode && categoryType && (
            <>
              <SelectItem
                value="__create_new__"
                className="text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  สร้างหมวดหมู่ใหม่...
                </span>
              </SelectItem>
              <SelectSeparator />
            </>
          )}
          
          {tree.map((group) => (
            <SelectGroup key={group.id}>
              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-2">
                {group.name}
              </SelectLabel>
              
              {group.children.length > 0 ? (
                // Show children
                group.children.map((child) => (
                  <SelectItem
                    key={child.id}
                    value={child.id}
                    className="pl-6"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      {child.name}
                    </span>
                  </SelectItem>
                ))
              ) : (
                // If group has no children, allow selecting the group itself
                <SelectItem key={group.id} value={group.id} className="pl-6">
                  <span className="flex items-center gap-2 text-muted-foreground italic">
                    (เลือกกลุ่มนี้)
                  </span>
                </SelectItem>
              )}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      
      {/* Create Category Dialog */}
      {companyCode && categoryType && (
        <CreateCategoryDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          companyCode={companyCode}
          categoryType={categoryType}
          categories={categories}
          onSuccess={handleCategoryCreated}
        />
      )}
    </div>
  );
}

// Re-export for backward compatibility
export { HierarchicalCategorySelector as CategorySelector };
