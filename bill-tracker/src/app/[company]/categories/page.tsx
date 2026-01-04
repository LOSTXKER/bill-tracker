"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  isDefault: boolean;
  isActive: boolean;
  color?: string | null;
  icon?: string | null;
  order: number;
}

export default function CategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = params.company as string;

  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#808080",
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/${companyCode}/categories?type=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          type: activeTab,
        }),
      });

      if (response.ok) {
        toast.success(editingCategory ? "แก้ไขหมวดหมู่สำเร็จ" : "สร้างหมวดหมู่สำเร็จ");
        setDialogOpen(false);
        setEditingCategory(null);
        setFormData({ name: "", color: "#808080", isActive: true });
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
    setFormData({
      name: category.name,
      color: category.color || "#808080",
      isActive: category.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/${companyCode}/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

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
      const response = await fetch(`/api/${companyCode}/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !category.isActive,
        }),
      });

      if (response.ok) {
        toast.success(category.isActive ? "ปิดใช้งานหมวดหมู่สำเร็จ" : "เปิดใช้งานหมวดหมู่สำเร็จ");
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error("ไม่สามารถอัพเดทสถานะได้");
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", color: "#808080", isActive: true });
    setDialogOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">หมวดหมู่</h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการหมวดหมู่รายจ่ายและรายรับของบริษัท
          </p>
        </div>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="mr-2 h-4 w-4" />
          รีเซ็ตค่าเริ่มต้น
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "EXPENSE" | "INCOME")}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="EXPENSE">รายจ่าย</TabsTrigger>
            <TabsTrigger value="INCOME">รายรับ</TabsTrigger>
          </TabsList>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            สร้างหมวดหมู่ใหม่
          </Button>
        </div>

        <CategoryTable
          categories={categories}
          onEdit={handleEdit}
          onDelete={(cat) => {
            setCategoryToDelete(cat);
            setDeleteDialogOpen(true);
          }}
          onToggleActive={handleToggleActive}
          loading={loading}
        />
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "แก้ไขหมวดหมู่" : "สร้างหมวดหมู่ใหม่"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "แก้ไขข้อมูลหมวดหมู่"
                : `สร้างหมวดหมู่${activeTab === "EXPENSE" ? "รายจ่าย" : "รายรับ"}ใหม่`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อหมวดหมู่</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ค่าอาหาร, ค่าเดินทาง"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">สี</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#808080"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">เปิดใช้งาน</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit">{editingCategory ? "บันทึก" : "สร้าง"}</Button>
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
              คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ &quot;{categoryToDelete?.name}&quot;?
              {categoryToDelete?.isDefault && (
                <span className="block mt-2 text-red-500">
                  หมวดหมู่เริ่มต้นไม่สามารถลบได้ กรุณาปิดการใช้งานแทน
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={categoryToDelete?.isDefault}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category) => void;
  loading: boolean;
}

function CategoryTable({ categories, onEdit, onDelete, onToggleActive, loading }: CategoryTableProps) {
  if (loading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  if (categories.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">ไม่มีหมวดหมู่</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อหมวดหมู่</TableHead>
            <TableHead className="w-24">สี</TableHead>
            <TableHead className="w-32">ประเภท</TableHead>
            <TableHead className="w-24">สถานะ</TableHead>
            <TableHead className="w-32 text-right">การกระทำ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: category.color || "#808080" }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs px-2 py-1 rounded-full bg-muted">
                  {category.isDefault ? "เริ่มต้น" : "กำหนดเอง"}
                </span>
              </TableCell>
              <TableCell>
                <Switch checked={category.isActive} onCheckedChange={() => onToggleActive(category)} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(category)}
                    disabled={category.isDefault}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
