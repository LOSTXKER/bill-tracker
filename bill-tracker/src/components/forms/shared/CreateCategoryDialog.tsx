"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { CategorySummary } from "@/types";

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyCode: string;
  categoryType: "EXPENSE" | "INCOME";
  categories: CategorySummary[]; // All categories to find groups
  onSuccess?: (category: CategorySummary) => void;
}

interface CategoryFormData {
  name: string;
  parentId: string | null;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  companyCode,
  categoryType,
  categories,
  onSuccess,
}: CreateCategoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    parentId: null,
  });

  // Get groups (categories without parentId)
  const groups = categories.filter((c) => !c.parentId && c.isActive);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        parentId: groups[0]?.id || null, // Default to first group
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent form

    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    if (!formData.parentId) {
      toast.error("กรุณาเลือกกลุ่มหมวดหมู่");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/${companyCode}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: categoryType,
          parentId: formData.parentId,
          isActive: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถสร้างหมวดหมู่ได้");
      }

      const newCategory = result.data?.category || result.category;
      
      toast.success(`สร้างหมวดหมู่ "${formData.name}" สำเร็จ`);
      onOpenChange(false);
      
      if (onSuccess && newCategory) {
        onSuccess(newCategory);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            สร้างหมวดหมู่ใหม่
          </DialogTitle>
          <DialogDescription>
            เพิ่มหมวดหมู่{categoryType === "EXPENSE" ? "รายจ่าย" : "รายรับ"}ใหม่
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Selection */}
          <div className="space-y-2">
            <Label>กลุ่มหมวดหมู่ *</Label>
            <Select
              value={formData.parentId || undefined}
              onValueChange={(value) => setFormData({ ...formData, parentId: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="เลือกกลุ่ม..." />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groups.length === 0 && (
              <p className="text-xs text-muted-foreground">
                ไม่มีกลุ่มหมวดหมู่ กรุณาไปที่หน้าตั้งค่าเพื่อสร้างกลุ่มก่อน
              </p>
            )}
          </div>

          {/* Category Name */}
          <div className="space-y-2">
            <Label>ชื่อหมวดหมู่ *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="เช่น ค่าน้ำมัน, ค่าอาหาร..."
              className="h-11"
              autoFocus
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isLoading || groups.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                "สร้างหมวดหมู่"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
