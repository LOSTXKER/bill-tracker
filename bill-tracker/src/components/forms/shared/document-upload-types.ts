import { FileText, CreditCard, FileCheck, type LucideIcon } from "lucide-react";
import { OTHER_DOC_TYPE_OPTIONS, OTHER_DOC_TYPE_LABELS, type OtherDocType, type TypedOtherDoc } from "@/lib/constants/transaction";

export { OTHER_DOC_TYPE_OPTIONS, OTHER_DOC_TYPE_LABELS, type OtherDocType, type TypedOtherDoc };

export type DocumentCategory = "invoice" | "slip" | "whtCert" | "other" | "uncategorized";

export interface CategorizedFiles {
  invoice: string[];
  slip: string[];
  whtCert: string[];
  other: TypedOtherDoc[];
  uncategorized: string[];
}

export function normalizeOtherDocs(docs: (string | TypedOtherDoc)[] | undefined | null): TypedOtherDoc[] {
  if (!docs) return [];
  const arr = Array.isArray(docs) ? docs : [];
  return arr.map(doc => {
    if (typeof doc === "string") {
      return { url: doc, type: "OTHER" as OtherDocType };
    }
    return doc;
  });
}

export function getOtherDocUrls(docs: TypedOtherDoc[]): string[] {
  return docs.map(d => d.url);
}

export interface FileClassification {
  url: string;
  type: DocumentCategory;
  confidence: number;
}

import type { MultiDocAnalysisResult } from "@/lib/ai/types";
export type { MultiDocAnalysisResult } from "@/lib/ai/types";

export interface OcrAnalysisResult {
  data: {
    vendorName: string | null;
    vendorTaxId: string | null;
    amount: number | null;
    vatRate: number | null;
    vatAmount: number | null;
    totalAmount: number | null;
    invoiceNumber: string | null;
    date: string | null;
    paymentMethod: string | null;
    confidence: {
      overall: number;
      amount: number;
      vendor: number;
      date: number;
    };
  };
  smart: MultiDocAnalysisResult["smart"];
  aiAccountSuggestion?: MultiDocAnalysisResult["aiAccountSuggestion"];
  validation: {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

export interface DocumentUploadSectionProps {
  companyCode: string;
  transactionType: "expense" | "income";
  onFilesChange: (files: CategorizedFiles) => void;
  onAiResult?: (result: MultiDocAnalysisResult) => void;
  showWhtCert?: boolean;
  initialFiles?: CategorizedFiles;
}

export interface CategoryConfig {
  label: string;
  labelIncome: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const CATEGORY_CONFIG: Record<DocumentCategory, CategoryConfig> = {
  invoice: {
    label: "ใบกำกับภาษี/ใบเสร็จ",
    labelIncome: "สำเนาบิลที่เราเขียนให้",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  slip: {
    label: "สลิปโอนเงิน",
    labelIncome: "สลิปลูกค้าโอนมา",
    icon: CreditCard,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  whtCert: {
    label: "ใบหัก ณ ที่จ่าย (50 ทวิ)",
    labelIncome: "ใบ 50 ทวิ ที่ลูกค้าให้มา",
    icon: FileCheck,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  other: {
    label: "เอกสารอื่นๆ",
    labelIncome: "เอกสารอื่นๆ",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  uncategorized: {
    label: "ยังไม่จำแนก",
    labelIncome: "ยังไม่จำแนก",
    icon: FileText,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
  },
};
