"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, LucideIcon, GraduationCap, Sparkles, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useContacts } from "@/hooks/use-contacts";
import { useCategories } from "@/hooks/use-categories";
import { AmountInput } from "./AmountInput";
import { VatToggle } from "./VatToggle";
import { WhtSection } from "./WhtSection";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { CalculationSummary } from "./CalculationSummary";
import { DocumentUploadSection, CategorizedFiles, MultiDocAnalysisResult } from "./DocumentUploadSection";
import { ContactSelector } from "./ContactSelector";
import { HierarchicalCategorySelector as CategorySelector } from "./HierarchicalCategorySelector";
import { DatePicker } from "./DatePicker";
import { MergeOptionsDialog, MergeData, MergeDecision } from "./MergeOptionsDialog";
import { ConflictDialog, ConflictField, ConflictResolution, detectConflicts } from "./ConflictDialog";
import { CurrencyConversionNote } from "./CurrencyConversionNote";
import type { ContactSummary } from "@/types";
// =============================================================================
// Auto-Learn Types & Logic (Client-safe - no Prisma imports)
// =============================================================================

interface LearnDecision {
  shouldLearn: boolean;
  confidence: number;
  reason: string;
  suggestAsk: boolean;
}

const AUTO_LEARN_THRESHOLD = 80;
const MIN_LEARN_THRESHOLD = 50;

function decideToLearn(
  confidence: number,
  hasVendorIdentifier: boolean,
  existingMappingId: string | null
): LearnDecision {
  if (existingMappingId) {
    return {
      shouldLearn: false,
      confidence,
      reason: "มี mapping อยู่แล้ว",
      suggestAsk: false,
    };
  }

  if (!hasVendorIdentifier) {
    return {
      shouldLearn: false,
      confidence: 0,
      reason: "ไม่มีข้อมูลร้านค้า",
      suggestAsk: false,
    };
  }

  if (confidence < MIN_LEARN_THRESHOLD) {
    return {
      shouldLearn: false,
      confidence,
      reason: "ความมั่นใจต่ำเกินไป",
      suggestAsk: false,
    };
  }

  if (confidence >= AUTO_LEARN_THRESHOLD) {
    return {
      shouldLearn: true,
      confidence,
      reason: "ความมั่นใจสูง - เรียนรู้อัตโนมัติ",
      suggestAsk: false,
    };
  }

  return {
    shouldLearn: true,
    confidence,
    reason: "ความมั่นใจปานกลาง - ควรถามผู้ใช้ก่อน",
    suggestAsk: true,
  };
}

// =============================================================================
// Types
// =============================================================================

export interface TransactionFormConfig {
  type: "expense" | "income";
  title: string;
  icon: LucideIcon;
  iconColor: string;
  buttonColor: string;
  apiEndpoint: string;
  redirectPath: string;
  
  // Field configurations
  fields: {
    dateField: {
      name: string;
      label: string;
    };
    descriptionField?: {
      name: string;
      label: string;
      placeholder: string;
    };
    whtField: {
      name: string; // "isWht" or "isWhtDeducted"
      label?: string;
      description?: string;
    };
    netAmountField: string; // "netPaid" or "netReceived"
  };
  
  // Default values
  defaultValues: Record<string, any>;
  
  // Status options
  statusOptions: Array<{
    value: string;
    label: string;
    color: string;
    condition?: (formData: any) => boolean;
  }>;
  
  // Calculation function
  calculateTotals: (
    amount: number,
    vatRate: number,
    whtRate: number
  ) => {
    baseAmount: number;
    vatAmount: number;
    whtAmount: number;
    totalWithVat: number;
    netAmount: number;
  };
  
  // Document upload configuration
  documentConfig: {
    type: "expense" | "income";
    fields: {
      slip: string;
      invoice: string;
      whtCert: string;
    };
  };
  
  // Additional fields renderer
  renderAdditionalFields?: (props: {
    register: any;
    watch: any;
    setValue: any;
  }) => ReactNode;
}

interface TransactionFormBaseProps {
  companyCode: string;
  config: TransactionFormConfig;
}

// =============================================================================
// Component
// =============================================================================

export function TransactionFormBase({ companyCode, config }: TransactionFormBaseProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [calculation, setCalculation] = useState({
    baseAmount: 0,
    vatAmount: 0,
    whtAmount: 0,
    totalWithVat: 0,
    netAmount: 0,
  });
  
  // Document files state (new hybrid structure)
  const [categorizedFiles, setCategorizedFiles] = useState<CategorizedFiles>({
    invoice: [],
    slip: [],
    whtCert: [],
    uncategorized: [],
  });

  // AI Analysis State
  const [aiResult, setAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [showTrainDialog, setShowTrainDialog] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  
  // Merge Dialog State
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [existingFormData, setExistingFormData] = useState<MergeData | null>(null);
  const [newAiData, setNewAiData] = useState<MergeData | null>(null);
  
  // Conflict Dialog State
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictField[]>([]);
  const [pendingMergedData, setPendingMergedData] = useState<MergeData | null>(null);

  // Use custom hooks for data fetching
  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);
  const { categories, isLoading: categoriesLoading, refetch: refetchCategories } = useCategories(
    companyCode,
    config.type.toUpperCase() as "EXPENSE" | "INCOME"
  );
  
  // Contact and category state
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [oneTimeContactName, setOneTimeContactName] = useState("");
  
  // Pending contact ID (for when contacts haven't loaded yet)
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  // Pending category ID (for when categories haven't loaded yet)
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);

  // Effect to apply pending contact when contacts are loaded
  useEffect(() => {
    if (pendingContactId && contacts.length > 0 && !selectedContact) {
      const contact = contacts.find((c) => c.id === pendingContactId);
      if (contact) {
        setSelectedContact(contact);
        setPendingContactId(null);
        console.log("Applied pending contact:", contact.name);
      }
    }
  }, [pendingContactId, contacts, selectedContact]);

  // Effect to apply pending category when categories are loaded
  useEffect(() => {
    if (pendingCategoryId && categories.length > 0 && !selectedCategory) {
      // Check if the category exists in the flat list
      const categoryExists = categories.some(cat => cat.id === pendingCategoryId);
      
      if (categoryExists) {
        setSelectedCategory(pendingCategoryId);
        setPendingCategoryId(null);
        console.log("Applied pending category:", pendingCategoryId);
      }
    }
  }, [pendingCategoryId, categories, selectedCategory]);
  
  // AI Category Suggestion (standalone - without OCR)
  const [categorySuggestion, setCategorySuggestion] = useState<{
    categoryId: string | null;
    categoryName: string | null;
    confidence: number;
    reason: string;
  } | null>(null);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: config.defaultValues,
  });

  const watchAmount = watch("amount");
  const watchVatRate = watch("vatRate");
  const watchIsWht = watch(config.fields.whtField.name);
  const watchWhtRate = watch("whtRate");
  const watchDate = watch(config.fields.dateField.name);

  useEffect(() => {
    const calc = config.calculateTotals(
      watchAmount || 0,
      watchVatRate || 0,
      watchIsWht ? (watchWhtRate || 0) : 0
    );
    setCalculation(calc);
  }, [watchAmount, watchVatRate, watchIsWht, watchWhtRate, config]);

  // Helper to check if form has existing data
  const hasExistingData = useCallback(() => {
    const currentAmount = watchAmount;
    const hasAmount = currentAmount !== null && currentAmount !== undefined && currentAmount !== 0 && currentAmount !== "";
    const hasContact = selectedContact !== null;
    return hasAmount || hasContact;
  }, [watchAmount, selectedContact]);

  // Helper to extract current form data as MergeData
  const extractFormData = useCallback((): MergeData => {
    return {
      amount: watchAmount ? Number(watchAmount) : null,
      vatAmount: calculation.vatAmount || null,
      vatRate: watchVatRate || null,
      vendorName: selectedContact?.name || null,
      vendorTaxId: selectedContact?.taxId || null,
      contactId: selectedContact?.id || null,
      date: watchDate ? new Date(watchDate).toISOString() : null,
      invoiceNumber: watch("invoiceNumber") || null,
      description: config.fields.descriptionField 
        ? watch(config.fields.descriptionField.name) || null 
        : null,
      categoryId: selectedCategory || null,
      paymentMethod: watch("paymentMethod") || null,
    };
  }, [watchAmount, calculation.vatAmount, watchVatRate, selectedContact, watchDate, watch, config, selectedCategory]);

  // Helper to extract AI result as MergeData
  const extractAiData = useCallback((result: MultiDocAnalysisResult): MergeData => {
    if (!result) {
      return {
        amount: null, vatAmount: null, vatRate: null, vendorName: null,
        vendorTaxId: null, contactId: null, date: null, invoiceNumber: null,
        description: null, categoryId: null, paymentMethod: null,
      };
    }
    const combined = result.combined || { totalAmount: 0, vatAmount: 0, date: null, invoiceNumbers: [], vendorName: null, vendorTaxId: null };
    const smart = result.smart;
    const suggested = (smart?.suggested || {}) as Record<string, any>;
    const vendorName = combined.vendorName || suggested.vendorName || null;
    
    // Extended combined type with additional fields from OCR
    const extendedCombined = combined as typeof combined & {
      vatRate?: number | null;
      paymentMethod?: string | null;
      amount?: number | null;
    };
    
    // Generate description if not provided
    let description = suggested.description || null;
    if (!description && vendorName && config.fields.descriptionField) {
      const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
      description = `${prefix} ${vendorName}`;
    }
    
    // Use amount before VAT, or calculate from totalAmount if not available
    let amount: number | null = null;
    if (extendedCombined.amount) {
      amount = extendedCombined.amount;
    } else if (combined.totalAmount && extendedCombined.vatRate) {
      amount = Math.round((combined.totalAmount / (1 + extendedCombined.vatRate / 100)) * 100) / 100;
    } else if (combined.totalAmount) {
      amount = combined.totalAmount;
    } else if (suggested.amount) {
      amount = suggested.amount;
    }
    
    return {
      amount,
      vatAmount: combined.vatAmount || suggested.vatAmount || null,
      vatRate: suggested.vatRate ?? extendedCombined.vatRate ?? null,
      vendorName,
      vendorTaxId: combined.vendorTaxId || suggested.vendorTaxId || null,
      contactId: suggested.contactId || null,
      date: combined.date || suggested.date || null,
      invoiceNumber: combined.invoiceNumbers?.[0] || null,
      description,
      categoryId: suggested.categoryId || null,
      paymentMethod: suggested.paymentMethod || extendedCombined.paymentMethod || null,
    };
  }, [config]);

  // Handle AI analysis result from DocumentUploadSection
  const handleAiResult = useCallback((result: MultiDocAnalysisResult) => {
    setAiResult(result);
    setAiApplied(false);
    
    // Check if there's existing data in the form
    if (hasExistingData()) {
      // Store pending data and show merge dialog
      setPendingAiResult(result);
      setExistingFormData(extractFormData());
      setNewAiData(extractAiData(result));
      setShowMergeDialog(true);
    } else {
      // No existing data, auto-apply
      applyAiResult(result);
    }
  }, [hasExistingData, extractFormData, extractAiData]);

  // Apply AI data to form
  const applyAiResult = useCallback((result: MultiDocAnalysisResult) => {
    if (!result) {
      console.error("applyAiResult: result is null/undefined");
      return;
    }
    
    const combined = result.combined || { totalAmount: 0, vatAmount: 0, date: null, invoiceNumbers: [], vendorName: null, vendorTaxId: null };
    const smart = result.smart;
    const suggested = (smart?.suggested || {}) as Record<string, any>;
    
    // Extended combined type with additional fields from OCR
    const extendedCombined = combined as typeof combined & {
      vatRate?: number | null;
      paymentMethod?: string | null;
      amount?: number | null;
    };

    // Apply amount from combined data
    // PRIORITY: If currency was converted, use the converted totalAmount
    const hasCurrencyConversion = result.currencyConversion?.convertedAmount !== null && 
      result.currencyConversion?.convertedAmount !== undefined &&
      result.currencyConversion?.currency !== "THB";
    
    if (hasCurrencyConversion && result.currencyConversion?.convertedAmount) {
      // Use converted amount (already in THB)
      setValue("amount", result.currencyConversion.convertedAmount);
    } else if (extendedCombined.amount) {
      // Use the amount before VAT directly
      setValue("amount", extendedCombined.amount);
    } else if (combined.totalAmount && extendedCombined.vatRate) {
      // Calculate amount before VAT from totalAmount
      const amountBeforeVat = combined.totalAmount / (1 + extendedCombined.vatRate / 100);
      setValue("amount", Math.round(amountBeforeVat * 100) / 100);
    } else if (combined.totalAmount) {
      // Fallback: use totalAmount if we don't know the VAT status
      setValue("amount", combined.totalAmount);
    } else if (suggested.amount !== null && suggested.amount !== undefined) {
      setValue("amount", suggested.amount);
    }

    // Apply VAT rate (from suggested or from combined OCR data)
    const vatRate = suggested.vatRate ?? extendedCombined.vatRate;
    if (vatRate !== null && vatRate !== undefined) {
      setValue("vatRate", vatRate);
    }

    // Apply date
    if (combined.date || suggested.date) {
      const dateStr = combined.date || suggested.date;
      if (dateStr) {
        setValue(config.fields.dateField.name, new Date(dateStr));
      }
    }

    // Apply payment method (from suggested or from combined OCR data)
    const paymentMethod = suggested.paymentMethod || extendedCombined.paymentMethod;
    if (paymentMethod) {
      setValue("paymentMethod", paymentMethod);
    }

    // Apply invoice number (first one from combined)
    if (combined.invoiceNumbers && combined.invoiceNumbers.length > 0) {
      setValue("invoiceNumber", combined.invoiceNumbers.join(", "));
    }

    // Apply description - priority: items from OCR > vendor mapping template > vendor name
    if (config.fields.descriptionField) {
      let description: string | null = null;

      // 1. Try to extract items/description from OCR files
      const allItems: string[] = [];
      for (const file of result.files || []) {
        // Cast to access items property from ReceiptData
        const extracted = file.extracted as { items?: Array<{ description: string; quantity?: number; unitPrice?: number; amount: number } | string> };
        if (extracted?.items && Array.isArray(extracted.items)) {
          for (const item of extracted.items) {
            if (typeof item === "string" && item.trim()) {
              allItems.push(item.trim());
            } else if (typeof item === "object" && item?.description && item.description.trim()) {
              allItems.push(item.description.trim());
            }
          }
        }
      }

      // Use items as description if found
      if (allItems.length > 0) {
        // Limit to first 5 items to avoid overly long descriptions
        const itemsText = allItems.slice(0, 5).join(", ");
        description = allItems.length > 5 
          ? `${itemsText} และอื่นๆ (${allItems.length} รายการ)`
          : itemsText;
      }

      // 2. Fallback to vendor mapping template
      if (!description && suggested.description) {
        description = suggested.description;
      }

      // 3. Fallback to vendor name
      if (!description && combined.vendorName) {
        const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
        description = `${prefix} ${combined.vendorName}`;
      }

      // Apply description if we have one
      if (description) {
        setValue(config.fields.descriptionField.name, description);
      }
    }

    // Apply contact from mapping or from foundContact (taxId/name lookup)
    const contactIdToUse = suggested.contactId || result.smart?.foundContact?.id;
    if (contactIdToUse) {
      const contact = contacts.find((c) => c.id === contactIdToUse);
      if (contact) {
        setSelectedContact(contact);
        console.log("Auto-filled contact:", contact.name);
      } else {
        // Store pending contact ID to apply when contacts are loaded
        setPendingContactId(contactIdToUse);
        console.log("Stored pending contact ID (contacts not loaded yet):", contactIdToUse);
      }
    }

    // Apply category from AI suggestion or mapping
    if (suggested.categoryId) {
      setSelectedCategory(suggested.categoryId);
      console.log("Auto-filled category:", suggested.categoryId);
    } else if (result.smart?.aiCategorySuggestion?.categoryId && result.smart.aiCategorySuggestion.confidence >= 70) {
      // Fallback: use AI suggestion if confidence is high
      setSelectedCategory(result.smart.aiCategorySuggestion.categoryId);
      setPendingCategoryId(result.smart.aiCategorySuggestion.categoryId);
      console.log("Auto-filled category from AI:", result.smart.aiCategorySuggestion.categoryName);
    }

    setAiApplied(true);
    toast.success("กรอกข้อมูลจาก AI แล้ว", {
      description: "โปรดตรวจสอบความถูกต้องก่อนบันทึก",
    });
  }, [setValue, config, contacts]);

  // Train AI (create vendor mapping)
  const handleTrain = useCallback(async () => {
    if (!aiResult) return;

    setIsTraining(true);
    try {
      const { combined } = aiResult;

      // Get actual description from form (if available)
      // This will be used as descriptionTemplate for future matches
      let descriptionTemplate: string | undefined;
      if (config.fields.descriptionField) {
        const currentDescription = watch(config.fields.descriptionField.name);
        if (currentDescription && typeof currentDescription === "string" && currentDescription.trim()) {
          // Use the actual description user entered
          descriptionTemplate = currentDescription.trim();
        } else {
          // Fallback to template with vendor name
          const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
          descriptionTemplate = `${prefix} {vendorName}`;
        }
      }

      // Call API to create mapping (รวม categoryId ด้วย)
      const response = await fetch("/api/vendor-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode: companyCode.toUpperCase(),
          transactionType: config.type.toUpperCase(),
          vendorName: combined.vendorName,
          vendorTaxId: combined.vendorTaxId,
          contactId: selectedContact?.id,
          categoryId: selectedCategory, // บันทึกหมวดหมู่ที่เลือกด้วย
          defaultVatRate: watchVatRate,
          paymentMethod: watch("paymentMethod"),
          descriptionTemplate,
          learnSource: "FEEDBACK",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "การสอน AI ล้มเหลว");
      }

      toast.success("สอน AI สำเร็จ!", {
        description: `AI จะจดจำผู้ติดต่อ หมวดหมู่ VAT และวิธีชำระเงิน`,
      });

      setShowTrainDialog(false);
      
      // Redirect after training
      toast.success(`บันทึก${config.title}สำเร็จ`);
      router.push(config.redirectPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsTraining(false);
    }
  }, [aiResult, companyCode, selectedContact, selectedCategory, watchVatRate, watch, config, router]);

  // AI Category Suggestion (with optional image analysis)
  const suggestCategory = useCallback(async () => {
    const vendorName = selectedContact?.name || null;
    // Get current description value directly from the form
    const descFieldName = config.fields.descriptionField?.name || "description";
    const description = watch(descFieldName) || null;
    
    // Get all uploaded file URLs
    const allFileUrls = [
      ...categorizedFiles.invoice,
      ...categorizedFiles.slip,
      ...categorizedFiles.whtCert,
      ...categorizedFiles.uncategorized,
    ].filter(Boolean);
    
    if (!vendorName && !description && allFileUrls.length === 0) {
      toast.error("กรุณาเลือกผู้ติดต่อ กรอกรายละเอียด หรือแนบไฟล์ก่อน");
      return;
    }

    setIsSuggestingCategory(true);
    setCategorySuggestion(null);

    try {
      const response = await fetch(`/api/${companyCode}/ai/suggest-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: config.type.toUpperCase(),
          vendorName,
          description,
          // ส่งรูปภาพแรกให้ AI วิเคราะห์ด้วย
          imageUrls: allFileUrls.slice(0, 1),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถแนะนำหมวดหมู่ได้");
      }

      const suggestion = result.data;
      setCategorySuggestion(suggestion);

      if (suggestion.categoryId && suggestion.confidence >= 70) {
        // Auto-select if confident
        setSelectedCategory(suggestion.categoryId);
        toast.success(`AI เลือก "${suggestion.categoryName}" (${suggestion.confidence}%)`, {
          description: suggestion.reason,
        });
      } else if (suggestion.categoryId) {
        // Show suggestion but don't auto-select
        toast.info("AI แนะนำหมวดหมู่", {
          description: `${suggestion.categoryName} (${suggestion.confidence}%) - ${suggestion.reason}`,
        });
      } else {
        toast.warning("AI ไม่แน่ใจหมวดหมู่", {
          description: suggestion.reason || "กรุณาเลือกหมวดหมู่เอง",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSuggestingCategory(false);
    }
  }, [selectedContact, config, companyCode, watch, categorizedFiles]);

  const onSubmit = async (data: any) => {
    // Validate required fields before submit
    const validationErrors: string[] = [];
    
    // Allow submission if contact is selected OR one-time name is provided
    const hasValidContact = selectedContact?.id || oneTimeContactName.trim();
    if (!hasValidContact) {
      validationErrors.push("กรุณาระบุผู้ติดต่อ");
    }
    
    if (!selectedCategory) {
      validationErrors.push("กรุณาเลือกหมวดหมู่");
    }
    
    if (!data.status) {
      validationErrors.push("กรุณาเลือกสถานะเอกสาร");
    }
    
    const descriptionValue = config.fields.descriptionField 
      ? data[config.fields.descriptionField.name]
      : null;
    if (config.fields.descriptionField && (!descriptionValue || descriptionValue.trim() === "")) {
      validationErrors.push("กรุณาระบุรายละเอียด");
    }
    
    if (!data.amount || data.amount <= 0) {
      validationErrors.push("กรุณาระบุจำนวนเงิน");
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "));
      return;
    }

    setIsLoading(true);
    try {
      // Map categorized files to the expected field names
      const fileData = {
        [config.documentConfig.fields.slip]: categorizedFiles.slip,
        [config.documentConfig.fields.invoice]: categorizedFiles.invoice,
        [config.documentConfig.fields.whtCert]: categorizedFiles.whtCert,
      };

      const response = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          companyCode: companyCode.toUpperCase(),
          contactId: selectedContact?.id || null,
          // Use one-time contact name if no contact selected (and not unknown)
          contactName: !selectedContact?.id && oneTimeContactName.trim() 
            ? oneTimeContactName.trim() 
            : null,
          categoryId: selectedCategory,
          category: undefined, // Remove old enum field
          vatAmount: calculation.vatAmount,
          whtAmount: calculation.whtAmount,
          [config.fields.netAmountField]: calculation.netAmount,
          ...fileData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      // Smart learning decision - use OCR vendor info OR selected contact
      const vendorName = aiResult?.combined?.vendorName || selectedContact?.name || null;
      const vendorTaxId = aiResult?.combined?.vendorTaxId || selectedContact?.taxId || null;
      const hasVendorIdentifier = !!(vendorName || vendorTaxId);
      const matchConfidence = aiResult?.smart?.matchConfidence || 0;
      const existingMappingId = aiResult?.smart?.mapping?.id || null;
      
      // Learn if: has contact - AI จำแค่ contact, VAT, payment method (ไม่จำ category)
      const shouldAutoLearn = hasVendorIdentifier && selectedContact?.id;

      if (shouldAutoLearn && !existingMappingId) {
        // Auto learn - create mapping WITHOUT category (user must choose category each time)
        try {
          const learnResponse = await fetch("/api/vendor-mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyCode: companyCode.toUpperCase(),
              transactionType: config.type.toUpperCase(),
              vendorName,
              vendorTaxId,
              contactId: selectedContact.id,
              categoryId: selectedCategory, // บันทึกหมวดหมู่ที่เลือกด้วย
              defaultVatRate: watchVatRate,
              paymentMethod: watch("paymentMethod"),
              learnSource: "AUTO",
            }),
          });

          if (learnResponse.ok) {
            toast.success(`บันทึก${config.title}สำเร็จ`, {
              description: `AI จดจำ "${vendorName}" แล้ว`,
            });
          } else {
            toast.success(`บันทึก${config.title}สำเร็จ`);
          }
        } catch {
          // Ignore learning errors, transaction was saved
          toast.success(`บันทึก${config.title}สำเร็จ`);
        }
        
        router.push(config.redirectPath);
        router.refresh();
        return;
      }

      toast.success(`บันทึก${config.title}สำเร็จ`);
      router.push(config.redirectPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // Continue after training dialog
  const continueAfterSave = () => {
    setShowTrainDialog(false);
    toast.success(`บันทึก${config.title}สำเร็จ`);
    router.push(config.redirectPath);
    router.refresh();
  };

  // Handle merge decision
  const handleMergeDecision = useCallback((decision: MergeDecision) => {
    if (decision.action === "cancel") {
      // Keep files but don't change form data
      setPendingAiResult(null);
      toast.info("เก็บไฟล์ไว้ แต่ไม่เปลี่ยนข้อมูลในฟอร์ม");
      return;
    }

    if (decision.action === "replace" && decision.mergedData) {
      // Apply new data directly, replacing existing
      applyMergedData(decision.mergedData);
      if (pendingAiResult) {
        setAiResult(pendingAiResult);
        setAiApplied(true);
      }
      setPendingAiResult(null);
      toast.success("แทนที่ข้อมูลด้วยข้อมูลจาก AI แล้ว");
      return;
    }

    if (decision.action === "merge" && decision.mergedData) {
      // Check for conflicts
      const conflicts = detectConflicts(
        existingFormData as unknown as Record<string, unknown>,
        newAiData as unknown as Record<string, unknown>
      );

      if (conflicts.length > 0) {
        // Show conflict resolution dialog
        setPendingConflicts(conflicts);
        setPendingMergedData(decision.mergedData);
        setShowConflictDialog(true);
      } else {
        // No conflicts, apply merged data
        applyMergedData(decision.mergedData);
        if (pendingAiResult) {
          setAiResult(pendingAiResult);
          setAiApplied(true);
        }
        setPendingAiResult(null);
        toast.success("รวมยอดเงินแล้ว");
      }
    }
  }, [existingFormData, newAiData, pendingAiResult]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback((resolution: ConflictResolution) => {
    if (!pendingMergedData || !existingFormData || !newAiData) return;

    // Apply resolution to merged data
    const finalData: MergeData = { ...pendingMergedData };
    
    for (const [field, choice] of Object.entries(resolution)) {
      const sourceData = choice === "existing" ? existingFormData : newAiData;
      (finalData as unknown as Record<string, unknown>)[field] = (sourceData as unknown as Record<string, unknown>)[field];
    }

    applyMergedData(finalData);
    if (pendingAiResult) {
      setAiResult(pendingAiResult);
      setAiApplied(true);
    }
    setPendingAiResult(null);
    setPendingConflicts([]);
    setPendingMergedData(null);
    toast.success("รวมข้อมูลสำเร็จ");
  }, [pendingMergedData, existingFormData, newAiData, pendingAiResult]);

  // Apply merged data to form
  const applyMergedData = useCallback((data: MergeData) => {
    if (data.amount !== null) {
      setValue("amount", data.amount);
    }
    if (data.vatRate !== null) {
      setValue("vatRate", data.vatRate);
    }
    if (data.date) {
      setValue(config.fields.dateField.name, new Date(data.date));
    }
    if (data.invoiceNumber) {
      setValue("invoiceNumber", data.invoiceNumber);
    }
    if (data.paymentMethod) {
      setValue("paymentMethod", data.paymentMethod);
    }
    if (data.description && config.fields.descriptionField) {
      setValue(config.fields.descriptionField.name, data.description);
    }
    if (data.contactId) {
      const contact = contacts.find((c) => c.id === data.contactId);
      if (contact) {
        setSelectedContact(contact);
      }
    }
    if (data.categoryId) {
      setSelectedCategory(data.categoryId);
    }
  }, [setValue, config, contacts]);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className={`p-2 rounded-xl ${config.iconColor}`}>
                <config.icon className="h-5 w-5" />
              </div>
              {config.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left Column (3/5): Main Info + Amount */}
              <div className="lg:col-span-3 space-y-6 p-6">
                {/* Details Section */}
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <DatePicker
                      label={config.fields.dateField.label}
                      value={watchDate}
                      onChange={(date) => setValue(config.fields.dateField.name, date || new Date())}
                      required
                    />

                    <AmountInput register={register} name="amount" />
                  </div>

                  {/* Currency Conversion Note */}
                  {aiResult?.currencyConversion && (
                    <CurrencyConversionNote currencyConversion={aiResult.currencyConversion} />
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <ContactSelector
                      contacts={contacts}
                      isLoading={contactsLoading}
                      selectedContact={selectedContact}
                      onSelect={setSelectedContact}
                      label="ผู้ติดต่อ"
                      placeholder="พิมพ์ชื่อหรือเลือกจากรายชื่อ..."
                      companyCode={companyCode}
                      onContactCreated={(newContact) => {
                        refetchContacts();
                        setSelectedContact(newContact);
                      }}
                      required
                      contactName={oneTimeContactName}
                      onContactNameChange={setOneTimeContactName}
                    />

                    {/* Category Selector with AI Button */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-medium">
                          หมวดหมู่ <span className="text-red-500">*</span>
                        </Label>
                        {/* AI Suggest Category Button - Always visible, compact */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary"
                                onClick={suggestCategory}
                                disabled={isSuggestingCategory}
                              >
                                {isSuggestingCategory ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="font-medium">AI แนะนำ</span>
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              <p className="font-semibold mb-1">AI แนะนำหมวดหมู่</p>
                              <p className="text-xs">
                                วิเคราะห์ชื่อคู่ค้า รายละเอียด และรายการสินค้า
                                เพื่อแนะนำหมวดหมู่ที่เหมาะสม พร้อมแสดงความมั่นใจ
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <CategorySelector
                        categories={categories}
                        isLoading={categoriesLoading}
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                        label=""
                        placeholder="เลือกหมวดหมู่"
                        companyCode={companyCode}
                        categoryType={config.type.toUpperCase() as "EXPENSE" | "INCOME"}
                        onCategoryCreated={(newCategory) => {
                          refetchCategories();
                          setSelectedCategory(newCategory.id);
                        }}
                      />
                    </div>

                    {/* AI Category Suggestion from OCR or Manual */}
                    {(() => {
                      const aiSuggestion = aiResult?.smart && 'aiCategorySuggestion' in aiResult.smart 
                        ? aiResult.smart.aiCategorySuggestion as { categoryId: string | null; categoryName: string | null; confidence: number; reason: string; } | undefined
                        : null;
                      const suggestion = categorySuggestion || aiSuggestion;
                      
                      if (!suggestion || selectedCategory) return null;
                      
                      return (
                        <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI แนะนำ</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={
                                    (suggestion.confidence || 0) >= 80 
                                      ? "border-green-500 text-green-600 cursor-help" 
                                      : (suggestion.confidence || 0) >= 60
                                      ? "border-yellow-500 text-yellow-600 cursor-help"
                                      : "border-red-500 text-red-600 cursor-help"
                                  }>
                                    {suggestion.confidence}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold">ความมั่นใจของ AI</p>
                                    <p>
                                      {(suggestion.confidence || 0) >= 80 
                                        ? "✅ สูงมาก - แนะนำให้ใช้" 
                                        : (suggestion.confidence || 0) >= 60
                                        ? "⚠️ ปานกลาง - ควรตรวจสอบ"
                                        : "❌ ต่ำ - ลองดูอีกครั้ง"}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {suggestion.reason}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (suggestion.categoryId) {
                                setSelectedCategory(suggestion.categoryId);
                                toast.success(`เลือกหมวดหมู่ "${suggestion.categoryName}" แล้ว`);
                              }
                            }}
                          >
                            ใช้หมวดหมู่นี้: {suggestion.categoryName}
                          </Button>
                        </div>
                      );
                    })()}
                    
                    {/* Quick Train AI Info - Show when contact selected but no existing mapping */}
                    {selectedContact && !aiResult?.smart?.mapping && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground cursor-help">
                              <Brain className="h-3 w-3" />
                              <span>AI จะจดจำ: &quot;{selectedContact.name}&quot; (ผู้ติดต่อ, หมวดหมู่, VAT, วิธีชำระเงิน)</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="font-semibold mb-1">🧠 การเรียนรู้อัตโนมัติ</p>
                            <p className="text-xs">
                              AI จะจดจำ: ผู้ติดต่อ, หมวดหมู่, VAT, วิธีชำระเงิน
                              <br />
                              <strong>หมวดหมู่</strong>: ต้องเลือกเองทุกครั้ง (เพราะร้านเดียวกันอาจมีหลายหมวดหมู่)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {config.fields.descriptionField && (
                    <div className="space-y-2">
                      <Label htmlFor={config.fields.descriptionField.name} className="text-sm text-muted-foreground">
                        {config.fields.descriptionField.label} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={config.fields.descriptionField.name}
                        placeholder={config.fields.descriptionField.placeholder}
                        className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
                        {...register(config.fields.descriptionField.name)}
                        required
                      />
                    </div>
                  )}

                  {/* Invoice Number & Reference No */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber" className="text-sm text-muted-foreground">
                        เลขที่ใบกำกับ
                      </Label>
                      <Input
                        id="invoiceNumber"
                        placeholder="เลขที่ใบกำกับภาษี (ถ้ามี)"
                        className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
                        {...register("invoiceNumber")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referenceNo" className="text-sm text-muted-foreground">
                        เลขอ้างอิง
                      </Label>
                      <Input
                        id="referenceNo"
                        placeholder="เลขอ้างอิง (ถ้ามี)"
                        className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
                        {...register("referenceNo")}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {config.renderAdditionalFields?.({ register, watch, setValue })}

                    <PaymentMethodSelect
                      value={watch("paymentMethod")}
                      onChange={(value) => setValue("paymentMethod", value)}
                      label={config.type === "income" ? "วิธีรับเงิน" : undefined}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        สถานะเอกสาร {!watch("status") && <span className="text-red-500">*</span>}
                      </Label>
                      <Select
                        value={watch("status") || ""}
                        onValueChange={(value) => setValue("status", value)}
                      >
                        <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
                          <SelectValue placeholder="เลือกสถานะ..." />
                        </SelectTrigger>
                        <SelectContent>
                          {config.statusOptions.map((option) => {
                            if (option.condition && !option.condition(watch())) {
                              return null;
                            }
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tax & Amount Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">ภาษีและยอดเงิน</h3>
                  
                  <VatToggle value={watchVatRate} onChange={(value) => setValue("vatRate", value)} />

                  <WhtSection
                    isEnabled={watchIsWht}
                    onToggle={(enabled) => {
                      setValue(config.fields.whtField.name, enabled);
                      if (!enabled) {
                        setValue("whtRate", undefined);
                        setValue("whtType", undefined);
                      }
                    }}
                    selectedRate={watchWhtRate}
                    onRateSelect={(rate, type) => {
                      setValue("whtRate", rate);
                      setValue("whtType", type);
                    }}
                    label={config.fields.whtField.label}
                    description={config.fields.whtField.description}
                  />

                  <Separator />

                  <CalculationSummary
                    baseAmount={calculation.baseAmount}
                    vatRate={watchVatRate}
                    vatAmount={calculation.vatAmount}
                    totalWithVat={calculation.totalWithVat}
                    whtRate={watchWhtRate}
                    whtAmount={calculation.whtAmount}
                    netAmount={calculation.netAmount}
                    type={config.type}
                    showWhtNote={watchIsWht && !!watchWhtRate}
                  />
                </div>
              </div>

              {/* Right Column (2/5): Documents */}
              <div className="lg:col-span-2 bg-muted/20 lg:border-l p-6 space-y-4">
                <DocumentUploadSection
                  companyCode={companyCode}
                  transactionType={config.type}
                  onFilesChange={setCategorizedFiles}
                  onAiResult={handleAiResult}
                  showWhtCert={watchIsWht}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => router.back()}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className={`flex-1 h-11 ${config.buttonColor}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                `บันทึก${config.title}`
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Train AI Dialog */}
      <Dialog open={showTrainDialog} onOpenChange={setShowTrainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-500" />
              สอน AI ให้จดจำร้านค้านี้?
            </DialogTitle>
            <DialogDescription>
              {aiResult?.combined?.vendorName && (
                <span className="block mt-2">
                  AI จะจดจำ <strong>&ldquo;{aiResult.combined.vendorName}&rdquo;</strong> เพื่อกรอกข้อมูลอัตโนมัติ
                  <br />
                  <span className="text-xs text-muted-foreground">(ผู้ติดต่อ, หมวดหมู่, VAT, วิธีชำระเงิน)</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium">ข้อมูลที่ AI จะจดจำ:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {aiResult?.combined?.vendorName && (
                  <li>• ชื่อร้าน: {aiResult.combined.vendorName}</li>
                )}
                {aiResult?.combined?.vendorTaxId && (
                  <li>• เลขผู้เสียภาษี: {aiResult.combined.vendorTaxId}</li>
                )}
                {selectedContact && <li>• ผู้ติดต่อ: {selectedContact.name}</li>}
                {selectedCategory && <li>• หมวดหมู่: {categories.flatMap(c => c.children || [c]).find(c => c.id === selectedCategory)?.name || selectedCategory}</li>}
                {watchVatRate !== undefined && <li>• VAT: {watchVatRate}%</li>}
                {watch("paymentMethod") && (
                  <li>• วิธีชำระเงิน: {watch("paymentMethod")}</li>
                )}
              </ul>
              <p className="text-xs text-green-600 mt-2">
                ✅ ครั้งหน้าจะกรอกข้อมูลนี้ให้อัตโนมัติ
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={continueAfterSave}
              disabled={isTraining}
            >
              ข้าม
            </Button>
            <Button
              onClick={handleTrain}
              disabled={isTraining}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isTraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  สอน AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Options Dialog */}
      {existingFormData && newAiData && (
        <MergeOptionsDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          existingData={existingFormData}
          newData={newAiData}
          onDecision={handleMergeDecision}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {pendingConflicts.length > 0 && (
        <ConflictDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          conflicts={pendingConflicts}
          onResolve={handleConflictResolution}
        />
      )}
    </>
  );
}
