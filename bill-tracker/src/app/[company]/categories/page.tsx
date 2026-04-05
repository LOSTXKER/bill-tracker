"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
  FolderOpen,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  Children?: Category[];
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

function CategoryItem({
  cat,
  companyCode,
  onMutate,
}: {
  cat: Category;
  companyCode: string;
  onMutate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cat.name);

  const handleSave = async () => {
    if (!editName.trim() || editName === cat.name) {
      setEditing(false);
      return;
    }
    const res = await fetch(`/api/${companyCode}/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      toast.success("อัปเดตหมวดหมู่สำเร็จ");
      onMutate();
    } else {
      toast.error("ไม่สามารถอัปเดตได้");
    }
    setEditing(false);
  };

  const handleToggle = async () => {
    const res = await fetch(`/api/${companyCode}/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    if (res.ok) {
      toast.success(cat.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน");
      onMutate();
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/${companyCode}/categories/${cat.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("ลบหมวดหมู่สำเร็จ");
      onMutate();
    } else {
      toast.error("ไม่สามารถลบได้");
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md group transition-colors ${
        cat.isActive ? "hover:bg-muted/50" : "opacity-50 bg-muted/30"
      }`}
    >
      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm">{cat.name}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditName(cat.name); setEditing(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggle}>
              {cat.isActive ? <ToggleRight className="h-3.5 w-3.5 text-green-500" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบหมวดหมู่ "{cat.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ถ้ามีรายการใช้งานอยู่จะปิดการใช้งานแทน
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryGroup({
  group,
  companyCode,
  onMutate,
}: {
  group: Category;
  companyCode: string;
  onMutate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [editingGroup, setEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(group.name);

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    const res = await fetch(`/api/${companyCode}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newChildName.trim(),
        type: group.type,
        parentId: group.id,
      }),
    });
    if (res.ok) {
      toast.success("เพิ่มหมวดย่อยสำเร็จ");
      setNewChildName("");
      setAddingChild(false);
      onMutate();
    } else {
      toast.error("ไม่สามารถเพิ่มได้");
    }
  };

  const handleSaveGroup = async () => {
    if (!editGroupName.trim() || editGroupName === group.name) {
      setEditingGroup(false);
      return;
    }
    const res = await fetch(`/api/${companyCode}/categories/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editGroupName.trim() }),
    });
    if (res.ok) {
      toast.success("อัปเดตกลุ่มสำเร็จ");
      onMutate();
    }
    setEditingGroup(false);
  };

  const children = group.Children || [];

  return (
    <Card className={`${group.isActive ? "" : "opacity-50"}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          {editingGroup ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="h-7 text-sm font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveGroup();
                  if (e.key === "Escape") setEditingGroup(false);
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveGroup}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGroup(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <CardTitle className="text-sm font-semibold flex-1 cursor-pointer" onClick={() => { setEditGroupName(group.name); setEditingGroup(true); }}>
              {group.name}
            </CardTitle>
          )}
          <Badge variant="secondary" className="text-xs shrink-0">
            {children.length}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => { setAddingChild(true); setExpanded(true); }}
          >
            <Plus className="h-3 w-3" />
            เพิ่ม
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 px-4 pb-3">
          <div className="ml-6 space-y-0.5">
            {children.map((child) => (
              <CategoryItem key={child.id} cat={child} companyCode={companyCode} onMutate={onMutate} />
            ))}
            {addingChild && (
              <div className="flex items-center gap-1 px-3 py-1">
                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder="ชื่อหมวดย่อย..."
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChild();
                    if (e.key === "Escape") { setAddingChild(false); setNewChildName(""); }
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddChild}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingChild(false); setNewChildName(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function CategoriesPage() {
  const params = useParams<{ company: string }>();
  const companyCode = params.company;

  const { data: expenseData, mutate: mutateExpense } = useSWR(
    `/api/${companyCode}/categories?type=EXPENSE&activeOnly=false`,
    fetcher
  );
  const { data: incomeData, mutate: mutateIncome } = useSWR(
    `/api/${companyCode}/categories?type=INCOME&activeOnly=false`,
    fetcher
  );

  const expenseGroups: Category[] = expenseData?.data?.categories || [];
  const incomeGroups: Category[] = incomeData?.data?.categories || [];
  const isEmpty = expenseGroups.length === 0 && incomeGroups.length === 0;

  const [addingGroup, setAddingGroup] = useState<"EXPENSE" | "INCOME" | null>(null);
  const [newGroupName, setNewGroupName] = useState("");

  const handleSeedDefaults = async () => {
    const res = await fetch(`/api/${companyCode}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed-defaults", name: "_", type: "EXPENSE" }),
    });
    if (res.ok) {
      toast.success("สร้างหมวดเริ่มต้นสำเร็จ");
      mutateExpense();
      mutateIncome();
    } else {
      const json = await res.json();
      toast.error(json?.error || "ไม่สามารถสร้างหมวดเริ่มต้นได้");
    }
  };

  const handleAddGroup = async (type: "EXPENSE" | "INCOME") => {
    if (!newGroupName.trim()) return;
    const res = await fetch(`/api/${companyCode}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim(), type }),
    });
    if (res.ok) {
      toast.success("เพิ่มกลุ่มสำเร็จ");
      setNewGroupName("");
      setAddingGroup(null);
      if (type === "EXPENSE") mutateExpense(); else mutateIncome();
    } else {
      toast.error("ไม่สามารถเพิ่มกลุ่มได้");
    }
  };

  const mutateAll = useCallback(() => {
    mutateExpense();
    mutateIncome();
  }, [mutateExpense, mutateIncome]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการหมวดหมู่</h1>
          <p className="text-sm text-muted-foreground">
            กำหนดหมวดหมู่สำหรับค่าใช้จ่ายและรายรับ
          </p>
        </div>
        {isEmpty && (
          <Button onClick={handleSeedDefaults} className="gap-2">
            <Sparkles className="h-4 w-4" />
            สร้างหมวดเริ่มต้น
          </Button>
        )}
      </div>

      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">
            ค่าใช้จ่าย
            <Badge variant="secondary" className="ml-2 text-xs">
              {expenseGroups.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="income">
            รายรับ
            <Badge variant="secondary" className="ml-2 text-xs">
              {incomeGroups.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-3 mt-4">
          {expenseGroups.map((group) => (
            <CategoryGroup
              key={group.id}
              group={group}
              companyCode={companyCode}
              onMutate={() => mutateExpense()}
            />
          ))}
          {addingGroup === "EXPENSE" ? (
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="ชื่อกลุ่มใหม่..."
                    className="h-8 text-sm font-semibold flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddGroup("EXPENSE");
                      if (e.key === "Escape") { setAddingGroup(null); setNewGroupName(""); }
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddGroup("EXPENSE")}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingGroup(null); setNewGroupName(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setAddingGroup("EXPENSE")}
            >
              <Plus className="h-4 w-4" />
              เพิ่มกลุ่มค่าใช้จ่าย
            </Button>
          )}
        </TabsContent>

        <TabsContent value="income" className="space-y-3 mt-4">
          {incomeGroups.map((group) => (
            <CategoryGroup
              key={group.id}
              group={group}
              companyCode={companyCode}
              onMutate={() => mutateIncome()}
            />
          ))}
          {addingGroup === "INCOME" ? (
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="ชื่อกลุ่มใหม่..."
                    className="h-8 text-sm font-semibold flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddGroup("INCOME");
                      if (e.key === "Escape") { setAddingGroup(null); setNewGroupName(""); }
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddGroup("INCOME")}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingGroup(null); setNewGroupName(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setAddingGroup("INCOME")}
            >
              <Plus className="h-4 w-4" />
              เพิ่มกลุ่มรายรับ
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
