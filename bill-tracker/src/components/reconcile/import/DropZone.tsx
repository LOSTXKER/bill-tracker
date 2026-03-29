"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, FileText, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  fileError: string;
  onFile: (file: File) => void;
  onManual: () => void;
}

export function DropZone({ isDragging, setIsDragging, fileError, onFile, onManual }: DropZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 py-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium text-foreground">วางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">
            <FileSpreadsheet className="h-3 w-3" /> .xlsx / .xls / .csv
          </span>
          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5">
            <FileText className="h-3 w-3" /> .pdf
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {fileError && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {fileError}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">หรือ</span>
        </div>
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={onManual}>
        <Plus className="h-4 w-4" />
        กรอกข้อมูลเองทีละแถว
      </Button>
    </div>
  );
}
