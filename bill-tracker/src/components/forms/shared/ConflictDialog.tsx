"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calendar, Store, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface ConflictField {
  field: string;
  label: string;
  icon: React.ReactNode;
  existingValue: string | null;
  newValue: string | null;
}

export interface ConflictResolution {
  [field: string]: "existing" | "new";
}

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictField[];
  onResolve: (resolution: ConflictResolution) => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function ConflictFieldRow({
  conflict,
  value,
  onChange,
}: {
  conflict: ConflictField;
  value: "existing" | "new";
  onChange: (v: "existing" | "new") => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {conflict.icon}
        {conflict.label}
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "existing" | "new")}
        className="grid grid-cols-2 gap-3"
      >
        <div
          className={cn(
            "flex items-start space-x-2 p-3 rounded-lg border cursor-pointer transition-colors",
            value === "existing"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
          onClick={() => onChange("existing")}
        >
          <RadioGroupItem value="existing" id={`${conflict.field}-existing`} />
          <Label
            htmlFor={`${conflict.field}-existing`}
            className="cursor-pointer flex-1"
          >
            <span className="text-xs text-muted-foreground block mb-1">
              ข้อมูลเดิม
            </span>
            <span className="font-medium">
              {conflict.existingValue || "(ว่าง)"}
            </span>
          </Label>
        </div>

        <div
          className={cn(
            "flex items-start space-x-2 p-3 rounded-lg border cursor-pointer transition-colors",
            value === "new"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
          onClick={() => onChange("new")}
        >
          <RadioGroupItem value="new" id={`${conflict.field}-new`} />
          <Label
            htmlFor={`${conflict.field}-new`}
            className="cursor-pointer flex-1"
          >
            <span className="text-xs text-muted-foreground block mb-1">
              ข้อมูลใหม่
            </span>
            <span className="font-medium text-primary">
              {conflict.newValue || "(ว่าง)"}
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ConflictDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
}: ConflictDialogProps) {
  // Initialize all conflicts to "existing" by default
  const [resolutions, setResolutions] = useState<ConflictResolution>(() => {
    const initial: ConflictResolution = {};
    conflicts.forEach((c) => {
      initial[c.field] = "existing";
    });
    return initial;
  });

  const handleConfirm = () => {
    onResolve(resolutions);
    onOpenChange(false);
  };

  const handleUseAllExisting = () => {
    const all: ConflictResolution = {};
    conflicts.forEach((c) => {
      all[c.field] = "existing";
    });
    setResolutions(all);
  };

  const handleUseAllNew = () => {
    const all: ConflictResolution = {};
    conflicts.forEach((c) => {
      all[c.field] = "new";
    });
    setResolutions(all);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            ข้อมูลไม่ตรงกัน
          </DialogTitle>
          <DialogDescription>
            ข้อมูลใหม่บางอย่างแตกต่างจากข้อมูลเดิม กรุณาเลือกว่าจะใช้ค่าใด
          </DialogDescription>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseAllExisting}
            className="flex-1"
          >
            ใช้ข้อมูลเดิมทั้งหมด
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseAllNew}
            className="flex-1"
          >
            ใช้ข้อมูลใหม่ทั้งหมด
          </Button>
        </div>

        <Separator />

        {/* Conflict fields */}
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <ConflictFieldRow
              key={conflict.field}
              conflict={conflict}
              value={resolutions[conflict.field] || "existing"}
              onChange={(v) =>
                setResolutions((prev) => ({
                  ...prev,
                  [conflict.field]: v,
                }))
              }
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleConfirm}>ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Helper to detect conflicts
// =============================================================================

export function detectConflicts(
  existingData: Record<string, unknown>,
  newData: Record<string, unknown>
): ConflictField[] {
  const conflicts: ConflictField[] = [];

  const fieldsToCheck: {
    field: string;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { field: "vendorName", label: "ร้าน/ผู้ขาย", icon: <Store className="h-4 w-4" /> },
    { field: "date", label: "วันที่", icon: <Calendar className="h-4 w-4" /> },
    { field: "invoiceNumber", label: "เลขที่เอกสาร", icon: <FileText className="h-4 w-4" /> },
  ];

  for (const check of fieldsToCheck) {
    const existingVal = existingData[check.field] as string | null;
    const newVal = newData[check.field] as string | null;

    // Only flag as conflict if both have values and they're different
    if (existingVal && newVal && existingVal !== newVal) {
      conflicts.push({
        field: check.field,
        label: check.label,
        icon: check.icon,
        existingValue: existingVal,
        newValue: newVal,
      });
    }
  }

  return conflicts;
}
