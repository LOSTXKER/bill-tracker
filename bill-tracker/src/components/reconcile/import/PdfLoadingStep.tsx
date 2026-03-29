"use client";

import { FileText, Loader2 } from "lucide-react";

interface PdfLoadingStepProps {
  pdfFileName: string;
}

export function PdfLoadingStep({ pdfFileName }: PdfLoadingStepProps) {
  return (
    <div className="py-12 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
          <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-foreground">กำลังอ่าน PDF...</p>
        <p className="text-sm text-muted-foreground">{pdfFileName}</p>
        <p className="text-xs text-muted-foreground">กำลัง extract ตารางภาษี รอสักครู่</p>
      </div>
    </div>
  );
}
