"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  FolderPlus,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  isDefault: boolean;
  isActive: boolean;
  order: number;
  parentId?: string | null;
  children?: Category[];
  _count?: {
    expenses: number;
    incomes: number;
  };
}

type DialogMode = "create-group" | "create-sub" | "edit";

export default function CategoriesPage() {
  const params = useParams();
  const companyCode = params.company as string;

  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create-group");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Build tree from categories - use children from API if available, otherwise build from flat list
  const categoryTree = useMemo(() => {
    // Groups are categories without parentId
    const groups = categories.filter((c) => !c.parentId);
    
    // If API already included children (via Prisma include), use those
    // Otherwise, build children map from flat list
    const hasIncludedChildren = groups.some((g) => g.children && g.children.length > 0);
    
    if (hasIncludedChildren) {
      // Children are already included from API
      return groups
        .map((group) => ({
          ...group,
          children: (group.children || []).sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.order - b.order);
    }
    
    // Fallback: Build tree from flat list
    const childCategories = categories.filter((c) => c.parentId);
    const childrenByParent = new Map<string, Category[]>();
    for (const child of childCategories) {
      if (!childrenByParent.has(child.parentId!)) {
        childrenByParent.set(child.parentId!, []);
      }
      childrenByParent.get(child.parentId!)!.push(child);
    }

    return groups
      .map((group) => ({
        ...group,
        children: (childrenByParent.get(group.id) || []).sort(
          (a, b) => a.order - b.order
        ),
      }))
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${companyCode}/categories?type=${activeTab}`);
      if (response.ok) {
        const result = await response.json();
        setCategories(result.data?.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch(`/api/${companyCode}/categories/reset`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error("ไม่สามารถรีเซ็ตหมวดหมู่ได้");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCategory
        ? `/api/${companyCode}/categories/${editingCategory.id}`
        : `/api/${companyCode}/categories`;

      const method = editingCategory ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        name: formData.name,
        type: activeTab,
        isActive: formData.isActive,
      };

      // For new categories, add parentId
      if (!editingCategory) {
        if (dialogMode === "create-sub" && selectedParentId) {
          payload.parentId = selectedParentId;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          editingCategory
            ? "แก้ไขหมวดหมู่สำเร็จ"
            : dialogMode === "create-group"
            ? "สร้างกลุ่มสำเร็จ"
            : "สร้างหมวดย่อยสำเร็จ"
        );
        closeDialog();
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error("ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogMode("edit");
    setFormData({
      name: category.name,
      isActive: category.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(
        `/api/${companyCode}/categories/${categoryToDelete.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("ลบหมวดหมู่สำเร็จ");
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error("ไม่สามารถลบหมวดหมู่ได้");
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const response = await fetch(
        `/api/${companyCode}/categories/${category.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !category.isActive }),
        }
      );

      if (response.ok) {
        toast.success(
          category.isActive ? "ปิดใช้งานหมวดหมู่สำเร็จ" : "เปิดใช้งานหมวดหมู่สำเร็จ"
        );
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error("ไม่สามารถอัพเดทสถานะได้");
    }
  };

  const openCreateGroupDialog = () => {
    setEditingCategory(null);
    setDialogMode("create-group");
    setFormData({ name: "", isActive: true });
    setDialogOpen(true);
  };

  const openCreateSubDialog = (parentId: string) => {
    setEditingCategory(null);
    setDialogMode("create-sub");
    setSelectedParentId(parentId);
    setFormData({ name: "", isActive: true });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setSelectedParentId(null);
    setFormData({ name: "", isActive: true });
  };

  // Get transaction count for a category
  const getTransactionCount = (category: Category) => {
    return (category._count?.expenses || 0) + (category._count?.incomes || 0);
  };

  // Navigate to transactions for a category
  const viewTransactions = (category: Category) => {
    const type = activeTab === "EXPENSE" ? "expenses" : "incomes";
    window.location.href = `/${companyCode}/${type}?category=${category.id}`;
  };

  const getDialogTitle = () => {
    if (editingCategory) return "แก้ไขหมวดหมู่";
    if (dialogMode === "create-group") return "สร้างกลุ่มใหม่";
    return "สร้างหมวดย่อย";
  };

  const getDialogDescription = () => {
    if (editingCategory) return "แก้ไขข้อมูลหมวดหมู่";
    if (dialogMode === "create-group") {
      return `สร้างกลุ่มหมวดหมู่${activeTab === "EXPENSE" ? "รายจ่าย" : "รายรับ"}ใหม่`;
    }
    const parentGroup = categoryTree.find((g) => g.id === selectedParentId);
    return `เพิ่มหมวดย่อยในกลุ่ม "${parentGroup?.name || ""}"`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">หมวดหมู่</h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการหมวดหมู่รายจ่ายและรายรับแบบ 2 ขั้น (กลุ่ม → หมวดย่อย)
          </p>
        </div>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="mr-2 h-4 w-4" />
          รีเซ็ตค่าเริ่มต้น
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "EXPENSE" | "INCOME")}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="EXPENSE">รายจ่าย</TabsTrigger>
            <TabsTrigger value="INCOME">รายรับ</TabsTrigger>
          </TabsList>
          <Button onClick={openCreateGroupDialog} size="sm">
            <FolderPlus className="mr-2 h-4 w-4" />
            สร้างกลุ่มใหม่
          </Button>
        </div>

        {/* Category Tree */}
        {loading ? (
          <div className="text-center py-8">กำลังโหลด...</div>
        ) : categoryTree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            ไม่มีหมวดหมู่ กดปุ่ม &quot;รีเซ็ตค่าเริ่มต้น&quot; เพื่อสร้างหมวดหมู่เริ่มต้น
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {categoryTree.map((group) => (
              <div key={group.id} className="border-b last:border-b-0">
                {/* Group header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors",
                    !group.isActive && "opacity-50"
                  )}
                >
                  {/* Left side - clickable to toggle */}
                  <button
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expandedGroups.has(group.id) && "rotate-90"
                      )}
                    />
                    <span className="font-semibold">{group.name}</span>
                    <div className="flex items-center gap-2">
                      {group.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          เริ่มต้น
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {group.children?.length || 0} หมวดย่อย
                      </Badge>
                    </div>
                  </button>

                    {/* Right side - actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={group.isActive}
                        onCheckedChange={() => handleToggleActive(group)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateSubDialog(group.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCategoryToDelete(group);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={group.isDefault}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                </div>

                {/* Children - collapsible */}
                {expandedGroups.has(group.id) && (
                  <div className="pl-12 pr-4 pb-3 space-y-1 bg-muted/20">
                    {(group.children || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3">
                        ยังไม่มีหมวดย่อย -{" "}
                        <button
                          onClick={() => openCreateSubDialog(group.id)}
                          className="text-primary hover:underline"
                        >
                          เพิ่มหมวดย่อย
                        </button>
                      </p>
                    ) : (
                      (group.children || []).map((child) => (
                        <div
                          key={child.id}
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background/50",
                            !child.isActive && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">└</span>
                            <span>{child.name}</span>
                            {child.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                เริ่มต้น
                              </Badge>
                            )}
                            {/* Transaction count with link */}
                            {getTransactionCount(child) > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewTransactions(child);
                                }}
                                className="text-xs text-primary hover:underline"
                              >
                                {getTransactionCount(child)} รายการ
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                0 รายการ
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={child.isActive}
                              onCheckedChange={() => handleToggleActive(child)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(child)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCategoryToDelete(child);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={child.isDefault}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {dialogMode === "create-group" || (!editingCategory?.parentId && editingCategory)
                    ? "ชื่อกลุ่ม"
                    : "ชื่อหมวดย่อย"}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={
                    dialogMode === "create-group"
                      ? "เช่น ต้นทุนขาย, ค่าใช้จ่ายบริหาร"
                      : "เช่น ค่าอาหาร, ค่าเดินทาง"
                  }
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">เปิดใช้งาน</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                ยกเลิก
              </Button>
              <Button type="submit">
                {editingCategory
                  ? "บันทึก"
                  : dialogMode === "create-group"
                  ? "สร้างกลุ่ม"
                  : "สร้างหมวดย่อย"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหมวดหมู่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ &quot;{categoryToDelete?.name}&quot;?
              {categoryToDelete?.isDefault && (
                <span className="block mt-2 text-red-500">
                  หมวดหมู่เริ่มต้นไม่สามารถลบได้ กรุณาปิดการใช้งานแทน
                </span>
              )}
              {!categoryToDelete?.parentId && (
                <span className="block mt-2 text-amber-500">
                  การลบกลุ่มจะลบหมวดย่อยทั้งหมดในกลุ่มด้วย
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={categoryToDelete?.isDefault}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
