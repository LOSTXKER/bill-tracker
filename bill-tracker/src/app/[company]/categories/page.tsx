"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  MoreHorizontal,
  GripVertical,
  Search,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface Category {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  Children?: Category[];
  _count?: { Expenses: number; Incomes: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getTxnCount(cat: Category): number {
  return (cat._count?.Expenses ?? 0) + (cat._count?.Incomes ?? 0);
}

function getGroupTotalTxn(group: Category): number {
  const own = getTxnCount(group);
  const childSum = (group.Children ?? []).reduce(
    (sum, c) => sum + getTxnCount(c),
    0
  );
  return own + childSum;
}

// ---------- Sortable Sub-category Item ----------

function SortableSubItem({
  cat,
  companyCode,
  onMutate,
}: {
  cat: Category;
  companyCode: string;
  onMutate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cat.name);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

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
      toast.success("อัปเดตสำเร็จ");
      onMutate();
    } else {
      toast.error("ไม่สามารถอัปเดตได้");
    }
    setEditing(false);
  };

  const handleToggle = async (checked: boolean) => {
    const res = await fetch(`/api/${companyCode}/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: checked }),
    });
    if (res.ok) {
      toast.success(checked ? "เปิดการใช้งาน" : "ปิดการใช้งาน");
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

  const txnCount = getTxnCount(cat);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
          cat.isActive ? "" : "opacity-50"
        }`}
      >
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleSave}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setEditing(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm truncate min-w-0">{cat.name}</span>
            {txnCount > 0 && (
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {txnCount}
              </span>
            )}
            <Switch
              checked={cat.isActive}
              onCheckedChange={handleToggle}
              className="shrink-0"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditName(cat.name);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  แก้ไขชื่อ
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  ลบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ &ldquo;{cat.name}&rdquo;?</AlertDialogTitle>
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
    </>
  );
}

// ---------- Sortable Group ----------

function SortableGroup({
  group,
  companyCode,
  onMutate,
  isOpen,
  onToggle,
  searchTerm,
}: {
  group: Category;
  companyCode: string;
  onMutate: () => void;
  isOpen: boolean;
  onToggle: () => void;
  searchTerm: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });
  const [editingGroup, setEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(group.name);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  const subSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const children = useMemo(() => {
    const all = group.Children ?? [];
    if (!searchTerm) return all;
    const term = searchTerm.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(term));
  }, [group.Children, searchTerm]);

  const totalTxn = getGroupTotalTxn(group);

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

  const handleToggleGroup = async (checked: boolean) => {
    const res = await fetch(`/api/${companyCode}/categories/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: checked }),
    });
    if (res.ok) {
      toast.success(checked ? "เปิดการใช้งาน" : "ปิดการใช้งาน");
      onMutate();
    }
  };

  const handleDeleteGroup = async () => {
    const res = await fetch(`/api/${companyCode}/categories/${group.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("ลบกลุ่มสำเร็จ");
      onMutate();
    } else {
      toast.error("ไม่สามารถลบได้");
    }
  };

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

  const handleSubDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const allChildren = group.Children ?? [];
    const oldIndex = allChildren.findIndex((c) => c.id === active.id);
    const newIndex = allChildren.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(allChildren, oldIndex, newIndex);
    await Promise.all(
      reordered.map((c, i) =>
        fetch(`/api/${companyCode}/categories/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        })
      )
    );
    onMutate();
    toast.success("เรียงลำดับสำเร็จ");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={group.isActive ? "" : "opacity-50"}
    >
      {/* Group header */}
      <div className="flex items-center gap-1.5 px-2 py-2 hover:bg-muted/30 transition-colors">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          className="shrink-0 p-0.5 rounded hover:bg-muted"
          onClick={onToggle}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />

        {editingGroup ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleSaveGroup}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setEditingGroup(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <span
              className="font-semibold text-sm flex-1 truncate min-w-0 cursor-pointer"
              onClick={onToggle}
            >
              {group.name}
            </span>
            <Badge variant="secondary" className="text-xs shrink-0 tabular-nums">
              {(group.Children ?? []).length}
            </Badge>
            {totalTxn > 0 && (
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {totalTxn} รายการ
              </span>
            )}
            <Switch
              checked={group.isActive}
              onCheckedChange={handleToggleGroup}
              className="shrink-0"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 shrink-0"
              onClick={() => {
                setAddingChild(true);
                if (!isOpen) onToggle();
              }}
            >
              <Plus className="h-3 w-3" />
              เพิ่ม
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditGroupName(group.name);
                    setEditingGroup(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  แก้ไขชื่อกลุ่ม
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  ลบกลุ่ม
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Children */}
      {isOpen && (
        <div className="ml-8 mr-2 pb-2 border-l border-muted ml-[1.35rem] pl-4">
          <DndContext
            sensors={subSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSubDragEnd}
          >
            <SortableContext
              items={children.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {children.map((child) => (
                <SortableSubItem
                  key={child.id}
                  cat={child}
                  companyCode={companyCode}
                  onMutate={onMutate}
                />
              ))}
            </SortableContext>
          </DndContext>
          {children.length === 0 && !addingChild && (
            <p className="text-xs text-muted-foreground px-2 py-1">
              ยังไม่มีหมวดย่อย
            </p>
          )}
          {addingChild && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="ชื่อหมวดย่อย..."
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChild();
                  if (e.key === "Escape") {
                    setAddingChild(false);
                    setNewChildName("");
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleAddChild}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setAddingChild(false);
                  setNewChildName("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ลบกลุ่ม &ldquo;{group.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ถ้ามีรายการใช้งานอยู่จะปิดการใช้งานแทน
              หมวดย่อยทั้งหมดจะถูกปิดการใช้งานด้วย
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Tab Content with group-level DnD ----------

function CategoryTabContent({
  groups,
  type,
  companyCode,
  onMutate,
  openGroups,
  toggleGroup,
  searchTerm,
  addingGroup,
  onCancelAddGroup,
}: {
  groups: Category[];
  type: "EXPENSE" | "INCOME";
  companyCode: string;
  onMutate: () => void;
  openGroups: string[];
  toggleGroup: (id: string) => void;
  searchTerm: string;
  addingGroup: boolean;
  onCancelAddGroup: () => void;
}) {
  const [newGroupName, setNewGroupName] = useState("");

  const groupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(groups, oldIndex, newIndex);
    await Promise.all(
      reordered.map((g, i) =>
        fetch(`/api/${companyCode}/categories/${g.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        })
      )
    );
    onMutate();
    toast.success("เรียงลำดับกลุ่มสำเร็จ");
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const res = await fetch(`/api/${companyCode}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim(), type }),
    });
    if (res.ok) {
      toast.success("เพิ่มกลุ่มสำเร็จ");
      setNewGroupName("");
      onCancelAddGroup();
      onMutate();
    } else {
      toast.error("ไม่สามารถเพิ่มกลุ่มได้");
    }
  };

  const cancelAdd = () => {
    setNewGroupName("");
    onCancelAddGroup();
  };

  if (groups.length === 0 && !addingGroup) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">
          {searchTerm ? "ไม่พบหมวดหมู่ที่ค้นหา" : "ยังไม่มีหมวดหมู่"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {addingGroup && (
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="ชื่อกลุ่มใหม่..."
            className="h-8 text-sm font-semibold flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddGroup();
              if (e.key === "Escape") cancelAdd();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleAddGroup}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={cancelAdd}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <DndContext
        sensors={groupSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleGroupDragEnd}
      >
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="border rounded-lg divide-y">
            {groups.map((group) => (
              <SortableGroup
                key={group.id}
                group={group}
                companyCode={companyCode}
                onMutate={onMutate}
                isOpen={openGroups.includes(group.id)}
                onToggle={() => toggleGroup(group.id)}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------- Main Page ----------

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

  const [searchTerm, setSearchTerm] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("expense");
  const [addingGroup, setAddingGroup] = useState(false);

  const currentGroups = activeTab === "expense" ? expenseGroups : incomeGroups;

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return currentGroups;
    const term = searchTerm.toLowerCase();
    return currentGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        (g.Children ?? []).some((c) => c.name.toLowerCase().includes(term))
    );
  }, [currentGroups, searchTerm]);

  useEffect(() => {
    if (!searchTerm) return;
    const term = searchTerm.toLowerCase();
    const matching = currentGroups
      .filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          (g.Children ?? []).some((c) => c.name.toLowerCase().includes(term))
      )
      .map((g) => g.id);
    if (matching.length > 0) {
      setOpenGroups((prev) => {
        const combined = new Set([...prev, ...matching]);
        return Array.from(combined);
      });
    }
  }, [searchTerm, currentGroups]);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }, []);

  const expandAll = useCallback(() => {
    setOpenGroups(filteredGroups.map((g) => g.id));
  }, [filteredGroups]);

  const collapseAll = useCallback(() => {
    setOpenGroups([]);
  }, []);

  const allExpanded =
    filteredGroups.length > 0 &&
    filteredGroups.every((g) => openGroups.includes(g.id));

  const mutateAll = useCallback(() => {
    mutateExpense();
    mutateIncome();
  }, [mutateExpense, mutateIncome]);

  const handleSeedDefaults = async () => {
    const res = await fetch(`/api/${companyCode}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "seed-defaults",
        name: "_",
        type: "EXPENSE",
      }),
    });
    if (res.ok) {
      toast.success("สร้างหมวดเริ่มต้นสำเร็จ");
      mutateAll();
    } else {
      const json = await res.json();
      toast.error(json?.error || "ไม่สามารถสร้างหมวดเริ่มต้นได้");
    }
  };

  return (
    <div className="space-y-4">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 flex-wrap">
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

          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาหมวดหมู่..."
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1 shrink-0"
              onClick={allExpanded ? collapseAll : expandAll}
              title={allExpanded ? "ปิดทั้งหมด" : "เปิดทั้งหมด"}
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? "ปิดทั้งหมด" : "เปิดทั้งหมด"}
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 text-xs gap-1 shrink-0"
              onClick={() => setAddingGroup(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มกลุ่ม
            </Button>
          </div>
        </div>

        <TabsContent value="expense" className="mt-4">
          <CategoryTabContent
            groups={activeTab === "expense" ? filteredGroups : []}
            type="EXPENSE"
            companyCode={companyCode}
            onMutate={() => mutateExpense()}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            searchTerm={searchTerm}
            addingGroup={addingGroup && activeTab === "expense"}
            onCancelAddGroup={() => setAddingGroup(false)}
          />
        </TabsContent>

        <TabsContent value="income" className="mt-4">
          <CategoryTabContent
            groups={activeTab === "income" ? filteredGroups : []}
            type="INCOME"
            companyCode={companyCode}
            onMutate={() => mutateIncome()}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            searchTerm={searchTerm}
            addingGroup={addingGroup && activeTab === "income"}
            onCancelAddGroup={() => setAddingGroup(false)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
