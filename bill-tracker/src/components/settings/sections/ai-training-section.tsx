"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Building2,
  Hash,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Wand2,
  User,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";
import { useCategories } from "@/hooks/use-categories";

interface VendorMapping {
  id: string;
  transactionType: "EXPENSE" | "INCOME";
  vendorName: string | null;
  vendorTaxId: string | null;
  namePattern: string | null;
  contactId: string | null;
  contactName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  defaultVatRate: number | null;
  paymentMethod: string | null;
  descriptionTemplate: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  learnSource: string | null;
}

type LearnSourceFilter = "ALL" | "MANUAL" | "AUTO" | "FEEDBACK";

type TransactionTypeFilter = "ALL" | "EXPENSE" | "INCOME";

interface AiTrainingSectionProps {
  companyId: string;
  companyCode: string;
}

const paymentMethodOptions = [
  { value: "CASH", label: "เงินสด" },
  { value: "BANK_TRANSFER", label: "โอนเงิน" },
  { value: "CREDIT_CARD", label: "บัตรเครดิต" },
  { value: "PROMPTPAY", label: "พร้อมเพย์" },
  { value: "CHEQUE", label: "เช็ค" },
];

export function AiTrainingSection({ companyId, companyCode }: AiTrainingSectionProps) {
  const [mappings, setMappings] = useState<VendorMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<LearnSourceFilter>("ALL");
  const [editingMapping, setEditingMapping] = useState<VendorMapping | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    transactionType: "EXPENSE" as "EXPENSE" | "INCOME",
    vendorName: "",
    vendorTaxId: "",
    namePattern: "",
    contactId: "",
    categoryId: "",
    defaultVatRate: "",
    paymentMethod: "",
    descriptionTemplate: "",
  });

  const { contacts, isLoading: contactsLoading } = useContacts(companyCode);
  
  // Use categories based on form's transaction type
  const { categories, isLoading: categoriesLoading } = useCategories(
    companyCode, 
    formData.transactionType
  );

  // Fetch mappings
  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        company: companyCode.toUpperCase(),
        ...(searchQuery && { search: searchQuery }),
        ...(typeFilter !== "ALL" && { type: typeFilter }),
      });

      const response = await fetch(`/api/vendor-mappings?${params}`);
      const result = await response.json();

      if (result.success) {
        setMappings(result.data.mappings);
      }
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyCode, searchQuery, typeFilter]);

  // Fetch suggestions for new mappings
  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/vendor-mappings/from-transaction?company=${companyCode.toUpperCase()}`
      );
      const result = await response.json();

      if (result.success) {
        setSuggestions(result.data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  }, [companyCode]);

  useEffect(() => {
    fetchMappings();
    fetchSuggestions();
  }, [fetchMappings, fetchSuggestions]);

  // Reset form
  const resetForm = () => {
    setFormData({
      transactionType: "EXPENSE",
      vendorName: "",
      vendorTaxId: "",
      namePattern: "",
      contactId: "",
      categoryId: "",
      defaultVatRate: "",
      paymentMethod: "",
      descriptionTemplate: "",
    });
  };

  // Open edit dialog
  const openEditDialog = (mapping: VendorMapping) => {
    setEditingMapping(mapping);
    setFormData({
      transactionType: mapping.transactionType,
      vendorName: mapping.vendorName || "",
      vendorTaxId: mapping.vendorTaxId || "",
      namePattern: mapping.namePattern || "",
      contactId: mapping.contactId || "",
      categoryId: mapping.categoryId || "",
      defaultVatRate: mapping.defaultVatRate?.toString() || "",
      paymentMethod: mapping.paymentMethod || "",
      descriptionTemplate: mapping.descriptionTemplate || "",
    });
  };

  // Save mapping
  const saveMapping = async () => {
    setIsSaving(true);
    try {
      const data = {
        companyCode: companyCode.toUpperCase(),
        transactionType: formData.transactionType,
        vendorName: formData.vendorName || undefined,
        vendorTaxId: formData.vendorTaxId || undefined,
        namePattern: formData.namePattern || undefined,
        contactId: formData.contactId || undefined,
        categoryId: formData.categoryId || undefined,
        defaultVatRate: formData.defaultVatRate ? parseInt(formData.defaultVatRate) : undefined,
        paymentMethod: formData.paymentMethod || undefined,
        descriptionTemplate: formData.descriptionTemplate || undefined,
      };

      const isEdit = !!editingMapping;
      const response = await fetch("/api/vendor-mappings", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...data, id: editingMapping.id } : data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "การบันทึกล้มเหลว");
      }

      toast.success(isEdit ? "อัปเดตสำเร็จ" : "เพิ่มการสอน AI สำเร็จ");
      setEditingMapping(null);
      setShowAddDialog(false);
      resetForm();
      fetchMappings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete mapping
  const deleteMapping = async (id: string) => {
    if (!confirm("ยืนยันการลบ?")) return;

    try {
      const response = await fetch(
        `/api/vendor-mappings?id=${id}&company=${companyCode.toUpperCase()}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "การลบล้มเหลว");
      }

      toast.success("ลบสำเร็จ");
      fetchMappings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  };

  const resetAllMappings = async () => {
    setIsResetting(true);
    try {
      // Delete all mappings for this company
      const deletePromises = mappings.map((m) =>
        fetch(
          `/api/vendor-mappings?id=${m.id}&company=${companyCode.toUpperCase()}`,
          { method: "DELETE" }
        )
      );
      
      await Promise.all(deletePromises);
      
      toast.success("รีเซ็ตสำเร็จ", {
        description: `ลบการสอน AI ทั้งหมด ${mappings.length} รายการ`,
      });
      
      setShowResetDialog(false);
      fetchMappings();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการรีเซ็ต");
    } finally {
      setIsResetting(false);
    }
  };

  // Quick add from suggestion
  const quickAddFromSuggestion = async (suggestion: any, txType: "EXPENSE" | "INCOME" = "EXPENSE") => {
    const prefix = txType === "EXPENSE" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
    setFormData({
      transactionType: txType,
      vendorName: suggestion.contactName || "",
      vendorTaxId: suggestion.taxId || "",
      namePattern: "",
      contactId: suggestion.contactId || "",
      categoryId: "",
      defaultVatRate: "7",
      paymentMethod: "BANK_TRANSFER",
      descriptionTemplate: `${prefix} {vendorName}`,
    });
    setShowAddDialog(true);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mappings.length}</p>
                <p className="text-sm text-muted-foreground">ร้านค้าที่สอนแล้ว</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mappings.reduce((sum, m) => sum + m.useCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">การใช้งานทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Sparkles className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suggestions.length}</p>
                <p className="text-sm text-muted-foreground">แนะนำให้เพิ่ม</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              แนะนำให้สอน AI
            </CardTitle>
            <CardDescription>
              ร้านค้าที่ใช้บ่อยแต่ยังไม่ได้สอน AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 5).map((s: any) => (
                <Button
                  key={s.contactId}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => quickAddFromSuggestion(s)}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {s.contactName}
                  <Badge variant="secondary" className="ml-1">
                    {s.transactionCount}x
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                รายการที่สอน AI แล้ว
              </CardTitle>
              <CardDescription>
                AI จะจดจำร้านค้าเหล่านี้และกรอกข้อมูลให้อัตโนมัติ
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              เพิ่มใหม่
            </Button>
          </div>

          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Type Filter Tabs */}
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground self-center mr-2">ประเภท:</span>
              <Button
                variant={typeFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("ALL")}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={typeFilter === "EXPENSE" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("EXPENSE")}
                className={typeFilter === "EXPENSE" ? "bg-red-500 hover:bg-red-600" : ""}
              >
                รายจ่าย
              </Button>
              <Button
                variant={typeFilter === "INCOME" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("INCOME")}
                className={typeFilter === "INCOME" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                รายรับ
              </Button>
            </div>

            {/* Source Filter */}
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground self-center mr-2">ที่มา:</span>
              <Button
                variant={sourceFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("ALL")}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={sourceFilter === "MANUAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("MANUAL")}
              >
                <User className="h-3 w-3 mr-1" />
                ตั้งเอง
              </Button>
              <Button
                variant={sourceFilter === "AUTO" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("AUTO")}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                อัตโนมัติ
              </Button>
              <Button
                variant={sourceFilter === "FEEDBACK" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("FEEDBACK")}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                ตอบกลับ
              </Button>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => setShowResetDialog(true)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              รีเซ็ต
            </Button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อร้าน, เลขผู้เสียภาษี..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "ไม่พบผลลัพธ์" : "ยังไม่มีการสอน AI"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                เพิ่มรายการแรก
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อร้าน</TableHead>
                    <TableHead className="hidden sm:table-cell">ประเภท</TableHead>
                    <TableHead className="hidden md:table-cell">เลขผู้เสียภาษี</TableHead>
                    <TableHead className="hidden lg:table-cell">ผู้ติดต่อ</TableHead>
                    <TableHead className="hidden lg:table-cell">หมวดหมู่</TableHead>
                    <TableHead className="hidden md:table-cell">ที่มา</TableHead>
                    <TableHead className="text-center">ใช้งาน</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings
                    .filter((m) => sourceFilter === "ALL" || m.learnSource === sourceFilter)
                    .map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {mapping.vendorName || mapping.namePattern || "-"}
                          </p>
                          {mapping.namePattern && mapping.vendorName && (
                            <p className="text-xs text-muted-foreground">
                              Pattern: {mapping.namePattern}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge 
                          variant="outline"
                          className={
                            mapping.transactionType === "EXPENSE" 
                              ? "border-red-500/50 text-red-600 bg-red-50 dark:bg-red-950/30" 
                              : "border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/30"
                          }
                        >
                          {mapping.transactionType === "EXPENSE" ? "รายจ่าย" : "รายรับ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {mapping.vendorTaxId || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {mapping.contactName || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {mapping.categoryName || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {mapping.learnSource === "AUTO" && (
                          <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            <Wand2 className="h-3 w-3 mr-1" />
                            อัตโนมัติ
                          </Badge>
                        )}
                        {mapping.learnSource === "MANUAL" && (
                          <Badge variant="outline" className="border-gray-500/50 text-gray-600 bg-gray-50 dark:bg-gray-950/30">
                            <User className="h-3 w-3 mr-1" />
                            ตั้งเอง
                          </Badge>
                        )}
                        {mapping.learnSource === "FEEDBACK" && (
                          <Badge variant="outline" className="border-purple-500/50 text-purple-600 bg-purple-50 dark:bg-purple-950/30">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            ตอบกลับ
                          </Badge>
                        )}
                        {!mapping.learnSource && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{mapping.useCount}x</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(mapping)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMapping(mapping.id)}
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingMapping}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingMapping(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {editingMapping ? "แก้ไขการสอน AI" : "สอน AI ใหม่"}
            </DialogTitle>
            <DialogDescription>
              ระบุข้อมูลที่ AI จะใช้จดจำและกรอกอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Transaction Type Selector */}
            <div className="space-y-2">
              <Label>ประเภทธุรกรรม</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.transactionType === "EXPENSE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData({ ...formData, transactionType: "EXPENSE", categoryId: "" })}
                  className={formData.transactionType === "EXPENSE" ? "bg-red-500 hover:bg-red-600 flex-1" : "flex-1"}
                  disabled={!!editingMapping}
                >
                  รายจ่าย
                </Button>
                <Button
                  type="button"
                  variant={formData.transactionType === "INCOME" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData({ ...formData, transactionType: "INCOME", categoryId: "" })}
                  className={formData.transactionType === "INCOME" ? "bg-green-500 hover:bg-green-600 flex-1" : "flex-1"}
                  disabled={!!editingMapping}
                >
                  รายรับ
                </Button>
              </div>
              {editingMapping && (
                <p className="text-xs text-muted-foreground">
                  ไม่สามารถเปลี่ยนประเภทได้ ให้ลบแล้วสร้างใหม่
                </p>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                เกณฑ์การจับคู่ (ต้องระบุอย่างน้อย 1 อย่าง)
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>ชื่อร้าน/บริษัท</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.vendorName}
                    onChange={(e) =>
                      setFormData({ ...formData, vendorName: e.target.value })
                    }
                    className="pl-10"
                    placeholder="เช่น บริษัท ABC จำกัด"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>เลขผู้เสียภาษี</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.vendorTaxId}
                    onChange={(e) =>
                      setFormData({ ...formData, vendorTaxId: e.target.value })
                    }
                    className="pl-10 font-mono"
                    placeholder="0123456789012"
                    maxLength={13}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ถ้าตรงกันจะจับคู่แม่นยำที่สุด
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pattern ชื่อ (ขั้นสูง)</Label>
                <Input
                  value={formData.namePattern}
                  onChange={(e) =>
                    setFormData({ ...formData, namePattern: e.target.value })
                  }
                  placeholder='เช่น "7-?Eleven.*" หรือ "โลตัส.*"'
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  รูปแบบ Regex สำหรับจับคู่ชื่อที่คล้ายกัน
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                ค่าที่จะกรอกอัตโนมัติ
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ผู้ติดต่อ</Label>
                <Select
                  value={formData.contactId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contactId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ติดต่อ" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>หมวดหมู่</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>VAT เริ่มต้น</Label>
                <Select
                  value={formData.defaultVatRate}
                  onValueChange={(value) =>
                    setFormData({ ...formData, defaultVatRate: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก VAT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">ไม่มี VAT (0%)</SelectItem>
                    <SelectItem value="7">VAT 7%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>วิธีชำระเงิน</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิธีชำระเงิน" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>รูปแบบรายละเอียด</Label>
              <Input
                value={formData.descriptionTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, descriptionTemplate: e.target.value })
                }
                placeholder="เช่น ค่าวัตถุดิบจาก {vendorName}"
              />
              <p className="text-xs text-muted-foreground">
                ใช้ {"{vendorName}"} เพื่อแทรกชื่อร้าน
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingMapping(null);
                resetForm();
              }}
              disabled={isSaving}
            >
              ยกเลิก
            </Button>
            <Button onClick={saveMapping} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  {editingMapping ? "บันทึก" : "สอน AI"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              รีเซ็ตการสอน AI ทั้งหมด?
            </DialogTitle>
            <DialogDescription>
              การดำเนินการนี้จะลบการสอน AI ทั้งหมด {mappings.length} รายการ 
              AI จะไม่สามารถจดจำร้านค้าใดๆ ได้จนกว่าจะมีการสอนใหม่
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
              <p className="font-medium text-destructive mb-1">ข้อมูลที่จะถูกลบ:</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• ร้านค้าที่สอนไว้ทั้งหมด</li>
                <li>• การเชื่อมโยงผู้ติดต่อและหมวดหมู่</li>
                <li>• ค่าเริ่มต้น VAT และวิธีชำระเงิน</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={isResetting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={resetAllMappings}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังรีเซ็ต...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  ยืนยันรีเซ็ต
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
