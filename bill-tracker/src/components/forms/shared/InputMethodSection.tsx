"use client";

import { useState } from "react";
import { ChevronDown, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentUploadSection, CategorizedFiles, MultiDocAnalysisResult, normalizeOtherDocs, type OtherDocType, type TypedOtherDoc } from "./DocumentUploadSection";
import { TextInputSection } from "./TextInputSection";

interface InputMethodSectionProps {
  companyCode: string;
  transactionType: "expense" | "income";
  onFilesChange: (files: CategorizedFiles) => void;
  onAiResult?: (result: MultiDocAnalysisResult) => void;
  showWhtCert?: boolean;
  initialFiles?: CategorizedFiles;
}

export function InputMethodSection({
  companyCode,
  transactionType,
  onFilesChange,
  onAiResult,
  showWhtCert = false,
  initialFiles,
}: InputMethodSectionProps) {
  const [showTextInput, setShowTextInput] = useState(false);

  return (
    <DocumentUploadSection
      companyCode={companyCode}
      transactionType={transactionType}
      onFilesChange={onFilesChange}
      onAiResult={onAiResult}
      showWhtCert={showWhtCert}
      initialFiles={initialFiles}
    >
      {/* Text Input - collapsible, inside the AI card */}
      <div className="border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground gap-2 h-8 px-1"
          onClick={() => setShowTextInput(!showTextInput)}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          วางข้อความจาก LINE / อีเมล ให้ AI อ่าน
          <ChevronDown className={cn(
            "h-3.5 w-3.5 ml-auto transition-transform",
            showTextInput && "rotate-180"
          )} />
        </Button>

        {showTextInput && (
          <div className="mt-2">
            <TextInputSection
              companyCode={companyCode}
              transactionType={transactionType}
              onAiResult={onAiResult}
            />
          </div>
        )}
      </div>
    </DocumentUploadSection>
  );
}

export type { CategorizedFiles, MultiDocAnalysisResult, OtherDocType, TypedOtherDoc };
export { normalizeOtherDocs };
