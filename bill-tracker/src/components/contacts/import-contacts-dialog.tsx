"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  SkipForward,
  Loader2,
  X,
  AlertTriangle,
  Trash2,
  RefreshCcw,
  Building2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ImportMode = "replace" | "merge";

interface PreviewContact {
  peakCode: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  prefix: string | null;
  taxId: string | null;
  entityType: string;
  contactCategory: string;
  phone: string | null;
  email: string | null;
  status: "new" | "update" | "skip";
  existingName: string | null;
}

interface PreviewStats {
  total: number;
  new: number;
  update: number;
  skip: number;
}

interface ImportContactsDialogProps {
  companyCode: string;
  onImportComplete?: () => void | Promise<void>;
}

const ENTITY_TYPE_LABELS: Record<string, { label: string; icon: typeof Building2 }> = {
  COMPANY: { label: "นิติบุคคล", icon: Building2 },
  INDIVIDUAL: { label: "บุคคลธรรมดา", icon: User },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "ลูกค้า", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  VENDOR: { label: "ผู้จำหน่าย", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  BOTH: { label: "ลูกค้า/ผู้จำหน่าย", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  OTHER: { label: "อื่นๆ", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

export function ImportContactsDialog({
  companyCode,
  onImportComplete,
}: ImportContactsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<PreviewContact[]>([]);
  const [stats, setStats] = useState<PreviewStats | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setPreviewContacts([]);
    setStats(null);
    setSelectedFile(null);
    setLoading(false);
    setImporting(false);
    setImportMode("replace");
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)");
      return;
    }

    setSelectedFile(file);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/contacts/import?company=${companyCode.toUpperCase()}&preview=true`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || "ไม่สามารถอ่านไฟล์ได้");
      }

      setPreviewContacts(json.data.contacts);
      setStats(json.data.stats);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
      resetState();
    } finally {
      setLoading(false);
    }
  }, [companyCode, resetState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", importMode);

      const response = await fetch(
        `/api/contacts/import?company=${companyCode.toUpperCase()}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || "Import ล้มเหลว");
      }

      toast.success(json.data.message);
      resetState();
      // Call onImportComplete first to refresh data, then close dialog
      await onImportComplete?.();
      setOpen(false);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setImporting(false);
    }
  }, [selectedFile, companyCode, importMode, resetState, onImportComplete]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  }, [resetState]);

  // Filter to show only new and update contacts
  const contactsToShow = previewContacts.filter(c => c.status !== "skip");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import จาก Peak
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import ผู้ติดต่อจาก Peak
          </DialogTitle>
          <DialogDescription>
            อัปโหลดไฟล์ Excel ที่ Export จาก Peak เพื่อ Sync ข้อมูลผู้ติดต่อ
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {!selectedFile ? (
            // Dropzone
            <div
              className={`
                border-2 border-dashed rounded-lg p-12
                flex flex-col items-center justify-center gap-4
                transition-colors cursor-pointer
                ${dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleBrowse}
            >
              <div className="p-4 bg-muted rounded-full">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  รองรับไฟล์ .xlsx และ .xls
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          ) : loading ? (
            // Loading
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">กำลังอ่านไฟล์...</p>
            </div>
          ) : stats ? (
            // Preview
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetState();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Import Mode Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">โหมดการ Import</Label>
                <RadioGroup
                  value={importMode}
                  onValueChange={(value) => setImportMode(value as ImportMode)}
                  className="space-y-2"
                >
                  <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-colors ${
                    importMode === "replace" 
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" 
                      : "border-transparent bg-muted/50"
                  }`}>
                    <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="replace" className="flex items-center gap-2 cursor-pointer font-medium">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        แทนที่ผู้ติดต่อทั้งหมด
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        ลบผู้ติดต่อเดิมทั้งหมด แล้วใช้ผู้ติดต่อจาก Peak เท่านั้น
                      </p>
                      {importMode === "replace" && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>ผู้ติดต่อที่ถูกใช้งานใน transaction จะถูกเก็บไว้และอัปเดตข้อมูล</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-colors ${
                    importMode === "merge" 
                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30" 
                      : "border-transparent bg-muted/50"
                  }`}>
                    <RadioGroupItem value="merge" id="merge" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="merge" className="flex items-center gap-2 cursor-pointer font-medium">
                        <RefreshCcw className="h-4 w-4 text-blue-600" />
                        เพิ่มเติม/อัปเดต
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        เพิ่มผู้ติดต่อใหม่ อัปเดตผู้ติดต่อที่มีอยู่แล้ว คงผู้ติดต่อเดิมที่ไม่มีใน Peak ไว้
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.new}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Plus className="h-3 w-3" /> สร้างใหม่
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.update}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Pencil className="h-3 w-3" /> อัปเดต
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-400">{stats.skip}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <SkipForward className="h-3 w-3" /> ไม่เปลี่ยนแปลง
                  </p>
                </div>
              </div>

              {/* Preview Table */}
              {contactsToShow.length > 0 ? (
                <div className="border rounded-lg max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[80px]">สถานะ</TableHead>
                        <TableHead className="w-[100px]">รหัส Peak</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead className="w-[120px]">ประเภท</TableHead>
                        <TableHead className="w-[120px]">ติดต่อ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactsToShow.slice(0, 50).map((contact) => {
                        const categoryInfo = CATEGORY_LABELS[contact.contactCategory];
                        const entityInfo = ENTITY_TYPE_LABELS[contact.entityType];
                        const EntityIcon = entityInfo?.icon || Building2;
                        return (
                          <TableRow key={contact.peakCode}>
                            <TableCell>
                              {contact.status === "new" ? (
                                <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                                  <Plus className="h-3 w-3" />
                                  ใหม่
                                </Badge>
                              ) : (
                                <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  <Pencil className="h-3 w-3" />
                                  อัปเดต
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono font-semibold text-sm">
                                {contact.peakCode}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <EntityIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{contact.name}</p>
                                  {contact.status === "update" && contact.existingName && (
                                    <p className="text-xs text-muted-foreground line-through truncate">
                                      {contact.existingName}
                                    </p>
                                  )}
                                  {contact.taxId && (
                                    <p className="text-xs text-muted-foreground">
                                      {contact.taxId}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={categoryInfo?.color || ""}>
                                {categoryInfo?.label || contact.contactCategory}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {contact.phone && <p>{contact.phone}</p>}
                                {contact.email && <p className="truncate max-w-[100px]">{contact.email}</p>}
                                {!contact.phone && !contact.email && <span>-</span>}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {contactsToShow.length > 50 && (
                    <div className="p-2 text-center text-sm text-muted-foreground border-t">
                      แสดง 50 จาก {contactsToShow.length} รายการ
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-lg font-medium">ข้อมูลผู้ติดต่อเป็นปัจจุบันแล้ว</p>
                  <p className="text-sm text-muted-foreground">
                    ไม่มีรายการที่ต้องสร้างใหม่หรืออัปเดต
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>หมายเหตุ:</strong> ระบบจะจับคู่ผู้ติดต่อด้วย "รหัสผู้ติดต่อ Peak" (C00001, C00002...)
                    หากไม่พบรหัสจะสร้างใหม่
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          {stats && (importMode === "replace" || stats.new > 0 || stats.update > 0) && (
            <Button
              onClick={handleImport}
              disabled={importing}
              variant={importMode === "replace" ? "destructive" : "default"}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลัง Import...
                </>
              ) : importMode === "replace" ? (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  แทนที่ด้วย {stats.total} รายการ
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import {stats.new + stats.update} รายการ
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
