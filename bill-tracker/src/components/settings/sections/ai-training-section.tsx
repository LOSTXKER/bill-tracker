"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Building2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  RefreshCcw,
  CheckCircle,
  ChevronDown,
  HelpCircle,
  ListFilter,
} from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";
import { AccountSelector } from "@/components/forms/shared/account-selector";

// =============================================================================
// Types
// =============================================================================

interface VendorMapping {
  id: string;
  transactionType: "EXPENSE" | "INCOME";
  vendorName: string | null;
  vendorTaxId: string | null;
  namePattern: string | null;
  contactId: string | null;
  contactName: string | null;
  accountId: string | null;
  accountName: string | null;
  defaultVatRate: number | null;
  paymentMethod: string | null;
  descriptionTemplate: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  learnSource: string | null;
}

interface AIStats {
  total: number;
  bySource: Record<string, number>;
  topVendors: Array<{
    id: string;
    vendorName: string | null;
    contactName: string | null;
    accountCode: string | null;
    accountName: string | null;
    useCount: number;
    lastUsed: string | null;
  }>;
  accountCoverage: {
    covered: number;
    total: number;
    percentage: number;
  };
}

interface Suggestion {
  contactId: string;
  contactName: string;
  taxId: string | null;
  transactionCount: number;
}

type TransactionTypeFilter = "ALL" | "EXPENSE" | "INCOME";
type LearnSourceFilter = "ALL" | "MANUAL" | "AUTO" | "FEEDBACK";

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

const sourceLabels: Record<string, string> = {
  MANUAL: "สอนเอง",
  AUTO: "อัตโนมัติ",
  FEEDBACK: "จากการแก้ไข",
  UNKNOWN: "ไม่ระบุ",
};

// =============================================================================
// Main Component
// =============================================================================

export function AiTrainingSection({ companyId, companyCode }: AiTrainingSectionProps) {
  // Stats state
  const [stats, setStats] = useState<AIStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Mappings state
  const [mappings, setMappings] = useState<VendorMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<LearnSourceFilter>("ALL");

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Dialog state
  const [editingMapping, setEditingMapping] = useState<VendorMapping | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    transactionType: "EXPENSE" as "EXPENSE" | "INCOME",
    vendorName: "",
    vendorTaxId: "",
    namePattern: "",
    contactId: "",
    accountId: "",
    defaultVatRate: "",
    paymentMethod: "",
    descriptionTemplate: "",
  });

  const { contacts, isLoading: contactsLoading } = useContacts(companyCode);

  // =============================================================================
  // Data Fetching
  // =============================================================================

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/ai/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch AI stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [companyCode]);

  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        company: companyCode.toUpperCase(),
        ...(searchQuery && { search: searchQuery }),
        ...(typeFilter !== "ALL" && { type: typeFilter }),
        ...(sourceFilter !== "ALL" && { source: sourceFilter }),
      });

      const res = await fetch(`/api/vendor-mappings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.data?.mappings || []);
      }
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyCode, searchQuery, typeFilter, sourceFilter]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/vendor-mappings/from-transaction?company=${companyCode.toUpperCase()}`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.data?.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  }, [companyCode]);

  useEffect(() => {
    fetchStats();
    fetchMappings();
    fetchSuggestions();
  }, [fetchStats, fetchMappings, fetchSuggestions]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const resetForm = () => {
    setFormData({
      transactionType: "EXPENSE",
      vendorName: "",
      vendorTaxId: "",
      namePattern: "",
      contactId: "",
      accountId: "",
      defaultVatRate: "",
      paymentMethod: "",
      descriptionTemplate: "",
    });
  };

  const startEdit = (mapping: VendorMapping) => {
    setEditingMapping(mapping);
    setFormData({
      transactionType: mapping.transactionType,
      vendorName: mapping.vendorName || "",
      vendorTaxId: mapping.vendorTaxId || "",
      namePattern: mapping.namePattern || "",
      contactId: mapping.contactId || "",
      accountId: mapping.accountId || "",
      defaultVatRate: mapping.defaultVatRate?.toString() || "",
      paymentMethod: mapping.paymentMethod || "",
      descriptionTemplate: mapping.descriptionTemplate || "",
    });
  };

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
        accountId: formData.accountId || undefined,
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

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "การบันทึกล้มเหลว");
      }

      toast.success(isEdit ? "อัปเดตสำเร็จ" : "เพิ่มการสอน AI สำเร็จ");
      setEditingMapping(null);
      setShowAddDialog(false);
      resetForm();
      fetchMappings();
      fetchStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMapping = async (id: string) => {
    if (!confirm("ต้องการลบการสอน AI นี้?")) return;

    try {
      const res = await fetch(
        `/api/vendor-mappings?id=${id}&company=${companyCode.toUpperCase()}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("ลบสำเร็จ");
        fetchMappings();
        fetchStats();
      } else {
        throw new Error("ลบไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const quickAddFromSuggestion = (suggestion: Suggestion) => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      vendorName: suggestion.contactName,
      vendorTaxId: suggestion.taxId || "",
      contactId: suggestion.contactId,
    }));
    setShowAddDialog(true);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Delete all mappings for this company
      for (const mapping of mappings) {
        await fetch(
          `/api/vendor-mappings?id=${mapping.id}&company=${companyCode.toUpperCase()}`,
          { method: "DELETE" }
        );
      }
      toast.success("รีเซ็ตสำเร็จ");
      setShowResetDialog(false);
      fetchMappings();
      fetchStats();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsResetting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
  };

  const refreshAll = () => {
    fetchStats();
    fetchMappings();
    fetchSuggestions();
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">AI</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats?.total || 0}</span>
              <span className="text-sm text-muted-foreground">ร้านที่รู้จัก</span>
            </div>
            {stats && Object.keys(stats.bySource).length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {Object.entries(stats.bySource).map(([source, count]) => (
                  <Badge key={source} variant="secondary" className="text-xs">
                    {sourceLabels[source] || source}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats?.accountCoverage.percentage || 0}%</span>
              <span className="text-sm text-muted-foreground">
                ครอบคลุมบัญชี ({stats?.accountCoverage.covered || 0}/{stats?.accountCoverage.total || 0})
              </span>
            </div>
            <Progress value={stats?.accountCoverage.percentage || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">พร้อมใช้งาน</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              AI วิเคราะห์อัตโนมัติเมื่อบันทึกรายการ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="known" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="known" className="gap-2">
            <Brain className="h-4 w-4" />
            ร้านที่รู้จัก
            {mappings.length > 0 && (
              <Badge variant="secondary" className="ml-1">{mappings.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="h-4 w-4" />
            แนะนำให้สอน
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{suggestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มเอง
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Known Vendors */}
        <TabsContent value="known" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อร้าน, เลขผู้เสียภาษี..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionTypeFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด</SelectItem>
                  <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
                  <SelectItem value="INCOME">รายรับ</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LearnSourceFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกที่มา</SelectItem>
                  <SelectItem value="MANUAL">สอนเอง</SelectItem>
                  <SelectItem value="AUTO">อัตโนมัติ</SelectItem>
                  <SelectItem value="FEEDBACK">แก้ไข</SelectItem>
                </SelectContent>
              </Select>
              {mappings.length > 0 && (
                <Button variant="outline" size="icon" onClick={() => setShowResetDialog(true)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ยังไม่มีการสอน AI</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI จะเรียนรู้อัตโนมัติเมื่อคุณบันทึกรายการ
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ร้านค้า</TableHead>
                    <TableHead>บัญชี</TableHead>
                    <TableHead className="text-center">ใช้งาน</TableHead>
                    <TableHead className="text-center">ที่มา</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{mapping.vendorName || mapping.contactName || "-"}</p>
                          {mapping.vendorTaxId && (
                            <p className="text-xs text-muted-foreground">{mapping.vendorTaxId}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {mapping.accountName ? (
                          <Badge variant="outline">{mapping.accountName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{mapping.useCount}x</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={mapping.learnSource === "MANUAL" ? "default" : "secondary"}>
                          {sourceLabels[mapping.learnSource || "UNKNOWN"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(mapping)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMapping(mapping.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Suggestions */}
        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">ไม่มีร้านค้าที่แนะนำให้สอน</p>
              <p className="text-sm text-muted-foreground mt-1">
                ร้านค้าที่ใช้บ่อยได้รับการสอน AI แล้วทั้งหมด
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((s) => (
                <Card key={s.contactId} className="cursor-pointer hover:border-primary transition-colors" onClick={() => quickAddFromSuggestion(s)}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.contactName}</p>
                        {s.taxId && (
                          <p className="text-xs text-muted-foreground">{s.taxId}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{s.transactionCount}x</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Add New */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">สอน AI ร้านค้าใหม่</CardTitle>
              <CardDescription>
                เพิ่มร้านค้าที่ต้องการให้ AI จดจำและกรอกข้อมูลให้อัตโนมัติ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MappingForm
                formData={formData}
                setFormData={setFormData}
                contacts={contacts}
                contactsLoading={contactsLoading}
                companyCode={companyCode}
              />
              <div className="flex justify-end">
                <Button onClick={saveMapping} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Explanation (Collapsible) */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            AI ทำงานอย่างไร?
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 bg-muted/50">
            <CardContent className="pt-4 space-y-2 text-sm">
              <p>• <strong>จดจำ:</strong> เมื่อคุณบันทึกรายการ AI จะจำว่าร้านนี้ใช้บัญชีอะไร</p>
              <p>• <strong>วิเคราะห์:</strong> ถ้าไม่รู้จัก AI จะใช้ความรู้วิเคราะห์ว่าควรเป็นบัญชีอะไร</p>
              <p>• <strong>เรียนรู้:</strong> ถ้าคุณแก้ไข AI จะจำการแก้ไขสำหรับครั้งหน้า</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Dialog */}
      <Dialog open={!!editingMapping} onOpenChange={(open) => !open && setEditingMapping(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไขการสอน AI</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลที่ AI จะใช้กรอกอัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <MappingForm
            formData={formData}
            setFormData={setFormData}
            contacts={contacts}
            contactsLoading={contactsLoading}
            companyCode={companyCode}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMapping(null)}>ยกเลิก</Button>
            <Button onClick={saveMapping} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog (for suggestions) */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>สอน AI ร้านค้าใหม่</DialogTitle>
            <DialogDescription>
              เพิ่มข้อมูลที่ AI จะใช้กรอกอัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <MappingForm
            formData={formData}
            setFormData={setFormData}
            contacts={contacts}
            contactsLoading={contactsLoading}
            companyCode={companyCode}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>ยกเลิก</Button>
            <Button onClick={saveMapping} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              รีเซ็ตการสอน AI ทั้งหมด
            </DialogTitle>
            <DialogDescription>
              ลบการสอน AI ทั้งหมด ({mappings.length} รายการ) - ไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ยืนยันรีเซ็ต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface MappingFormProps {
  formData: {
    transactionType: "EXPENSE" | "INCOME";
    vendorName: string;
    vendorTaxId: string;
    namePattern: string;
    contactId: string;
    accountId: string;
    defaultVatRate: string;
    paymentMethod: string;
    descriptionTemplate: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<MappingFormProps["formData"]>>;
  contacts: any[];
  contactsLoading: boolean;
  companyCode: string;
}

function MappingForm({ formData, setFormData, contacts, contactsLoading, companyCode }: MappingFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ประเภท</Label>
          <Select
            value={formData.transactionType}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, transactionType: v as "EXPENSE" | "INCOME" }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
              <SelectItem value="INCOME">รายรับ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>VAT</Label>
          <Select
            value={formData.defaultVatRate}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, defaultVatRate: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือก VAT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7%</SelectItem>
              <SelectItem value="0">0%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>ชื่อร้านค้า (จาก OCR)</Label>
        <Input
          value={formData.vendorName}
          onChange={(e) => setFormData((prev) => ({ ...prev, vendorName: e.target.value }))}
          placeholder="เช่น บริษัท ABC จำกัด"
        />
      </div>

      <div className="space-y-2">
        <Label>เลขผู้เสียภาษี</Label>
        <Input
          value={formData.vendorTaxId}
          onChange={(e) => setFormData((prev) => ({ ...prev, vendorTaxId: e.target.value }))}
          placeholder="13 หลัก"
        />
      </div>

      <div className="space-y-2">
        <Label>บัญชี</Label>
        <AccountSelector
          value={formData.accountId}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, accountId: v || "" }))}
          companyCode={companyCode}
          placeholder="เลือกบัญชี..."
        />
      </div>

      <div className="space-y-2">
        <Label>วิธีชำระเงิน</Label>
        <Select
          value={formData.paymentMethod}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, paymentMethod: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกวิธีชำระเงิน" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
