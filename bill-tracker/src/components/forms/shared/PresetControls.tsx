"use client";

import { useEffect, useState } from "react";
import type { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bookmark,
  ListChecks,
  Loader2,
  Plus,
  Replace,
} from "lucide-react";
import { toast } from "sonner";

import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";
import type { ContactSummary } from "@/types";
import type { ContactDefaults, TransactionPreset } from "@/hooks/use-contact-defaults";
import { useTransactionFormContext } from "../TransactionFormContext";

const DOC_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "ใบกำกับภาษี",
  CASH_RECEIPT: "บิลเงินสด",
  NO_DOCUMENT: "ไม่มีเอกสาร",
};

const WHT_TYPE_LABELS: Record<string, string> = {
  SERVICE_3: "ค่าบริการ",
  PROFESSIONAL_5: "ค่าวิชาชีพ",
  TRANSPORT_1: "ค่าขนส่ง",
  RENT_5: "ค่าเช่า",
  ADVERTISING_2: "ค่าโฆษณา",
};

// ---------------------------------------------------------------------------
// Wrapper: full preset controls row (dropdown + save button + dialog).
// Self-contained so both CreateModeContent and ViewEditModeContent render it
// with a single tag.
// ---------------------------------------------------------------------------

export interface PresetControlsProps {
  companyCode: string;
  selectedContact: ContactSummary | null;
  contactDefaults: ContactDefaults | null;
  mutateContactDefaults: () => void;
  config: UnifiedTransactionConfig;
  watch: UseFormWatch<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
}

export function PresetControls({
  companyCode,
  selectedContact,
  contactDefaults,
  mutateContactDefaults,
  config,
  watch,
  setValue,
}: PresetControlsProps) {
  const [savePresetOpen, setSavePresetOpen] = useState(false);

  if (!selectedContact) return null;

  const hasPresets = !!contactDefaults && contactDefaults.presets.length > 0;

  return (
    <>
      <div className="flex items-center gap-2">
        {hasPresets && (
          <div className="flex-1">
            <PresetDropdown
              presets={contactDefaults!.presets}
              config={config}
              setValue={setValue}
            />
          </div>
        )}
        <div className={hasPresets ? "" : "flex-1"}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-9 whitespace-nowrap"
            onClick={() => setSavePresetOpen(true)}
          >
            <Bookmark className="h-3.5 w-3.5" />
            บันทึกเป็น Preset
          </Button>
        </div>
      </div>

      <SavePresetDialog
        open={savePresetOpen}
        onOpenChange={setSavePresetOpen}
        companyCode={companyCode}
        contactId={selectedContact.id}
        existingPresets={contactDefaults?.presets ?? []}
        config={config}
        watch={watch}
        onSaved={mutateContactDefaults}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// PresetDropdown — loads a preset into the form
// ---------------------------------------------------------------------------

export function PresetDropdown({
  presets,
  config,
  setValue,
}: {
  presets: TransactionPreset[];
  config: UnifiedTransactionConfig;
  setValue: UseFormSetValue<Record<string, unknown>>;
}) {
  const { onAccountChange, onCategoryChange } = useTransactionFormContext();

  const handleSelect = (index: string) => {
    const preset = presets[Number(index)];
    if (!preset) return;

    if (preset.description && config.fields.descriptionField?.name) {
      setValue(config.fields.descriptionField.name, preset.description);
    }
    if (preset.accountId) onAccountChange(preset.accountId);
    if (preset.categoryId) onCategoryChange(preset.categoryId);
    if (preset.vatRate != null) setValue("vatRate", Number(preset.vatRate));
    if (preset.whtEnabled != null) {
      setValue("isWht", preset.whtEnabled);
      if (preset.whtType) setValue("whtType", preset.whtType);
      if (preset.whtRate != null) setValue("whtRate", Number(preset.whtRate));
    }
    if (preset.documentType) setValue("documentType", preset.documentType);
    if (preset.notes) setValue("notes", preset.notes);
  };

  return (
    <div className="flex items-center gap-3">
      <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground mb-1 block">
          เลือก Preset
        </Label>
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="เลือก preset..." />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset, index) => (
              <SelectItem key={index} value={String(index)}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SavePresetDialog — save current form values as a preset under the contact
// ---------------------------------------------------------------------------

export function SavePresetDialog({
  open,
  onOpenChange,
  companyCode,
  contactId,
  existingPresets,
  config,
  watch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyCode: string;
  contactId: string;
  existingPresets: TransactionPreset[];
  config: UnifiedTransactionConfig;
  watch: UseFormWatch<Record<string, unknown>>;
  onSaved: () => void;
}) {
  const { selectedAccount, selectedCategory } = useTransactionFormContext();

  const [saveMode, setSaveMode] = useState<"new" | "overwrite">("new");
  const [overwriteIndex, setOverwriteIndex] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSaveMode("new");
      setOverwriteIndex(null);
      setLabel("");

      if (selectedAccount) {
        fetch(`/api/${companyCode.toLowerCase()}/accounts`)
          .then((r) => r.json())
          .then((json) => {
            const accounts = json.data?.accounts || json.accounts || [];
            const found = accounts.find(
              (a: { id: string; code: string; name: string }) => a.id === selectedAccount,
            );
            setAccountName(found ? `${found.code} - ${found.name}` : null);
          })
          .catch(() => setAccountName(null));
      } else {
        setAccountName(null);
      }

      if (selectedCategory) {
        const catType = config.type === "expense" ? "EXPENSE" : "INCOME";
        fetch(`/api/${companyCode}/categories?type=${catType}`)
          .then((r) => r.json())
          .then((json) => {
            const groups = json.data?.categories || [];
            for (const g of groups) {
              const found = (g.children || []).find(
                (c: { id: string }) => c.id === selectedCategory,
              );
              if (found) {
                setCategoryName(found.name);
                return;
              }
            }
            setCategoryName(null);
          })
          .catch(() => setCategoryName(null));
      } else {
        setCategoryName(null);
      }
    }
  }, [open, selectedAccount, selectedCategory, companyCode, config.type]);

  const buildPresetFromForm = (): TransactionPreset => {
    const desc = config.fields.descriptionField
      ? String(watch(config.fields.descriptionField.name) || "")
      : "";
    return {
      label: label.trim(),
      description: desc,
      accountId: selectedAccount || null,
      categoryId: selectedCategory || null,
      vatRate: watch("vatRate") != null ? Number(watch("vatRate")) : null,
      whtEnabled: !!watch("isWht"),
      whtRate: watch("whtRate") != null ? Number(watch("whtRate")) : null,
      whtType: (watch("whtType") as string) || null,
      documentType: (watch("documentType") as string) || null,
      notes: (watch("notes") as string) || null,
    };
  };

  const handleSelectOverwriteTarget = (index: number) => {
    setOverwriteIndex(index);
    const preset = existingPresets[index];
    if (preset) setLabel(preset.label);
  };

  const handleSaveModeChange = (mode: "new" | "overwrite") => {
    setSaveMode(mode);
    if (mode === "new") {
      setOverwriteIndex(null);
      setLabel("");
    } else if (mode === "overwrite" && existingPresets.length > 0) {
      handleSelectOverwriteTarget(0);
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("กรุณาระบุชื่อ Preset");
      return;
    }
    if (saveMode === "overwrite" && overwriteIndex === null) {
      toast.error("กรุณาเลือก preset ที่ต้องการบันทึกทับ");
      return;
    }

    setSaving(true);
    try {
      const newPreset = buildPresetFromForm();

      const updatedPresets =
        saveMode === "overwrite" && overwriteIndex !== null
          ? existingPresets.map((p, i) => (i === overwriteIndex ? newPreset : p))
          : [...existingPresets, newPreset];

      const res = await fetch(
        `/api/${companyCode.toUpperCase()}/contacts/${contactId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptionPresets: updatedPresets }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "บันทึกไม่สำเร็จ");
      }

      toast.success(saveMode === "overwrite" ? "บันทึกทับ preset แล้ว" : "บันทึก preset แล้ว");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const hasExisting = existingPresets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>บันทึกเป็น Preset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PresetPreviewSummary
            config={config}
            watch={watch}
            accountName={accountName}
            categoryName={categoryName}
          />

          {hasExisting && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={saveMode === "new" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleSaveModeChange("new")}
              >
                <Plus className="h-3.5 w-3.5" />
                สร้างใหม่
              </Button>
              <Button
                type="button"
                variant={saveMode === "overwrite" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleSaveModeChange("overwrite")}
              >
                <Replace className="h-3.5 w-3.5" />
                บันทึกทับอันเดิม
              </Button>
            </div>
          )}

          {saveMode === "overwrite" && hasExisting && (
            <div className="space-y-1.5">
              <Label className="text-sm">เลือก preset ที่ต้องการบันทึกทับ</Label>
              <Select
                value={overwriteIndex !== null ? String(overwriteIndex) : undefined}
                onValueChange={(val) => handleSelectOverwriteTarget(Number(val))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="เลือก preset..." />
                </SelectTrigger>
                <SelectContent>
                  {existingPresets.map((preset, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">
              ชื่อ Preset <span className="text-red-500">*</span>
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น ค่าบริการรายเดือน"
              className="h-10"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {saveMode === "overwrite" ? "บันทึกทับ" : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// PresetPreviewSummary — shows what's going to be saved
// ---------------------------------------------------------------------------

function PresetPreviewSummary({
  config,
  watch,
  accountName,
  categoryName,
}: {
  config: UnifiedTransactionConfig;
  watch: UseFormWatch<Record<string, unknown>>;
  accountName: string | null;
  categoryName: string | null;
}) {
  const desc = config.fields.descriptionField
    ? String(watch(config.fields.descriptionField.name) || "")
    : "";
  const vatRate = watch("vatRate") != null ? Number(watch("vatRate")) : null;
  const whtEnabled = !!watch("isWht");
  const whtRate = watch("whtRate") != null ? Number(watch("whtRate")) : null;
  const whtType = (watch("whtType") as string) || null;
  const docType = (watch("documentType") as string) || null;
  const notes = (watch("notes") as string) || null;

  const rows: { label: string; value: string | null }[] = [];

  if (desc) rows.push({ label: "คำอธิบาย", value: desc });
  if (docType && config.type === "expense") {
    rows.push({ label: "ประเภทเอกสาร", value: DOC_TYPE_LABELS[docType] || docType });
  }
  rows.push({ label: "VAT", value: vatRate ? `${vatRate}%` : "ไม่มี" });

  if (whtEnabled && whtRate) {
    const typeLabel = whtType ? WHT_TYPE_LABELS[whtType] || whtType : null;
    rows.push({
      label: "หัก ณ ที่จ่าย",
      value: `${whtRate}%${typeLabel ? ` (${typeLabel})` : ""}`,
    });
  } else {
    rows.push({ label: "หัก ณ ที่จ่าย", value: "ไม่หัก" });
  }

  if (accountName) rows.push({ label: "บัญชี", value: accountName });
  if (categoryName) rows.push({ label: "หมวดหมู่", value: categoryName });
  if (notes) rows.push({ label: "หมายเหตุ", value: notes });

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-0">
      <p className="text-xs font-medium text-muted-foreground mb-2">ข้อมูลที่จะบันทึก</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="text-muted-foreground whitespace-nowrap">{row.label}</span>
            <span className="text-foreground truncate">{row.value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
