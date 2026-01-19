"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, MessageSquareText } from "lucide-react";
import { DocumentUploadSection, CategorizedFiles, MultiDocAnalysisResult } from "./DocumentUploadSection";
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
  const [activeTab, setActiveTab] = useState<"document" | "text">("document");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "document" | "text")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="document" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            อัปโหลดเอกสาร
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" />
            วางข้อความ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="document" className="mt-0">
          <DocumentUploadSection
            companyCode={companyCode}
            transactionType={transactionType}
            onFilesChange={onFilesChange}
            onAiResult={onAiResult}
            showWhtCert={showWhtCert}
            initialFiles={initialFiles}
          />
        </TabsContent>

        <TabsContent value="text" className="mt-0">
          <TextInputSection
            companyCode={companyCode}
            transactionType={transactionType}
            onAiResult={onAiResult}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Re-export types for convenience
export type { CategorizedFiles, MultiDocAnalysisResult };
