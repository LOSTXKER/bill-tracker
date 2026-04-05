"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, Sparkles, Search, Plus, X, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CategoryChild {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryGroup {
  id: string;
  name: string;
  type: string;
  parentId: null;
  isActive: boolean;
  sortOrder: number;
  Children: CategoryChild[];
}

interface SuggestedCategory {
  categoryId: string;
  categoryName: string;
  groupName: string;
  confidence: number;
  reason: string;
}

interface CategorySelectorProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  companyCode: string;
  type: "EXPENSE" | "INCOME";
  className?: string;
  placeholder?: string;
  suggestedCategoryId?: string;
  alternatives?: SuggestedCategory[];
  disabled?: boolean;
  required?: boolean;
}

export function CategorySelector({
  value,
  onValueChange,
  companyCode,
  type,
  className,
  placeholder = "เลือกหมวดหมู่...",
  suggestedCategoryId,
  alternatives = [],
  disabled = false,
  required = false,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickCreating, setQuickCreating] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatGroupId, setNewCatGroupId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${companyCode}/categories?type=${type}&activeOnly=true`);
      if (res.ok) {
        const json = await res.json();
        setGroups(json?.data?.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, [companyCode, type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const allChildren = useMemo(() => {
    return groups.flatMap(g => g.Children.map(c => ({ ...c, groupName: g.name })));
  }, [groups]);

  const selectedCategory = allChildren.find(c => c.id === value);
  const selectedGroupName = selectedCategory
    ? groups.find(g => g.id === selectedCategory.parentId)?.name
    : null;

  const suggestedCategory = allChildren.find(c => c.id === suggestedCategoryId);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    const q = searchQuery.toLowerCase();
    return groups
      .map(g => ({
        ...g,
        Children: g.Children.filter(
          c => c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.Children.length > 0);
  }, [groups, searchQuery]);

  const handleQuickCreate = async () => {
    if (!newCatName.trim() || !newCatGroupId) return;
    try {
      const res = await fetch(`/api/${companyCode}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          type,
          parentId: newCatGroupId,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const newCat = json?.data?.category;
        toast.success(`สร้างหมวด "${newCatName.trim()}" สำเร็จ`);
        setNewCatName("");
        setNewCatGroupId(null);
        setQuickCreating(false);
        await fetchCategories();
        if (newCat?.id) {
          onValueChange(newCat.id);
          setOpen(false);
        }
      } else {
        toast.error("ไม่สามารถสร้างหมวดได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="space-y-1.5 flex-1">
      <div className="flex gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between h-10", className)}
              disabled={disabled || loading}
            >
              <div className="flex items-center gap-2 flex-1 truncate">
                {selectedCategory ? (
                  <>
                    <span className="text-xs text-muted-foreground">[{selectedGroupName}]</span>
                    <span className="truncate">{selectedCategory.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
              {suggestedCategoryId && !value && (
                <Badge variant="secondary" className="ml-2 gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  placeholder="ค้นหาหมวดหมู่..."
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <CommandList>
                <CommandEmpty>
                  <p className="text-muted-foreground py-2">ไม่พบหมวดหมู่ที่ตรงกัน</p>
                </CommandEmpty>

                {/* AI Suggestion */}
                {suggestedCategory && (
                  <CommandGroup heading="✨ AI แนะนำ">
                    <CommandItem
                      value={`ai-${suggestedCategory.id}-${suggestedCategory.name}`}
                      onSelect={() => { onValueChange(suggestedCategory.id); setOpen(false); }}
                      className={cn(
                        "border-l-2 border-primary",
                        value === suggestedCategory.id ? "bg-primary/10" : "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-muted-foreground">
                          [{groups.find(g => g.id === suggestedCategory.parentId)?.name}]
                        </span>
                        <span className="flex-1">{suggestedCategory.name}</span>
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      {value === suggestedCategory.id && <Check className="ml-2 h-4 w-4 text-primary" />}
                    </CommandItem>
                    {alternatives.map((alt) => {
                      const altCat = allChildren.find(c => c.id === alt.categoryId);
                      if (!altCat) return null;
                      return (
                        <CommandItem
                          key={alt.categoryId}
                          value={`alt-${alt.categoryId}-${altCat.name}`}
                          onSelect={() => { onValueChange(alt.categoryId); setOpen(false); }}
                          className={cn(
                            "border-l-2 border-muted-foreground/30",
                            value === alt.categoryId && "bg-muted border-l-primary"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs text-muted-foreground">[{alt.groupName}]</span>
                            <span className="flex-1 text-sm">{altCat.name}</span>
                            <span className="text-xs text-muted-foreground">{alt.confidence}%</span>
                          </div>
                          {value === alt.categoryId && <Check className="ml-2 h-4 w-4 text-primary" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {/* Grouped categories */}
                {filteredGroups.map((group) => (
                  <CommandGroup key={group.id} heading={group.name}>
                    {group.Children.map((child) => (
                      <CommandItem
                        key={child.id}
                        value={`${group.name}-${child.name}-${child.id}`}
                        onSelect={() => {
                          onValueChange(child.id === value ? null : child.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="flex-1">{child.name}</span>
                        </div>
                        {value === child.id && <Check className="ml-2 h-4 w-4 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}

                {/* Quick create */}
                <div className="p-2 border-t">
                  {quickCreating ? (
                    <div className="space-y-2">
                      <select
                        className="w-full h-8 px-2 text-sm border rounded-md bg-background"
                        value={newCatGroupId || ""}
                        onChange={(e) => setNewCatGroupId(e.target.value || null)}
                      >
                        <option value="">-- เลือกกลุ่ม --</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <Input
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="ชื่อหมวดย่อยใหม่..."
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickCreate();
                            if (e.key === "Escape") setQuickCreating(false);
                          }}
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-8"
                          onClick={handleQuickCreate}
                          disabled={!newCatName.trim() || !newCatGroupId}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => { setQuickCreating(false); setNewCatName(""); setNewCatGroupId(null); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setQuickCreating(true)}
                    >
                      <Plus className="h-4 w-4" />
                      สร้างหมวดใหม่
                    </Button>
                  )}
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => onValueChange(null)}
            title="ล้างการเลือก"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
