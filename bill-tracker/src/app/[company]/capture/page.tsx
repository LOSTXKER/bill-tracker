"use client";

import { useState, use, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, ArrowDownCircle, ReceiptText, PenLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CapturePageProps {
  params: Promise<{ company: string }>;
}

export default function CapturePage({ params }: CapturePageProps) {
  const { company: companyCode } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get("type");
  const fromReimbursement = searchParams.get("fromReimbursement");
  const formContainerRef = useRef<HTMLDivElement>(null);
  
  // Set initial tab based on query parameter, default to "expense"
  const initialTab = (typeParam === "income" || typeParam === "expense") ? typeParam : "expense";
  const [activeTab, setActiveTab] = useState<"expense" | "income">(initialTab);
  
  // Update tab when query parameter changes
  useEffect(() => {
    if (typeParam === "income" || typeParam === "expense") {
      setActiveTab(typeParam);
    }
  }, [typeParam]);

  const handleTabChange = (value: string) => {
    const tab = value as "expense" | "income";
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", tab);
    router.replace(`/${companyCode}/capture?${params.toString()}`, { scroll: false });
    // Auto-focus first input after tab switch
    requestAnimationFrame(() => {
      const input = formContainerRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        "input:not([type=hidden]):not([type=checkbox]):not([disabled]), textarea:not([disabled])"
      );
      input?.focus();
    });
  };

  // Parse pre-fill data from sessionStorage (for reimbursement → expense conversion)
  const [prefillData, setPrefillData] = useState<Record<string, unknown> | undefined>(undefined);
  const [prefillLoaded, setPrefillLoaded] = useState(!fromReimbursement); // If no reimbursement, already "loaded"
  
  useEffect(() => {
    if (!fromReimbursement) {
      setPrefillData(undefined);
      setPrefillLoaded(true);
      return;
    }
    
    // Try to get data from sessionStorage
    try {
      const stored = sessionStorage.getItem("prefillExpenseData");
      if (stored) {
        const data = JSON.parse(stored);
        // Verify this is for the correct reimbursement
        if (data.fromReimbursement === fromReimbursement) {
          // Convert billDate string back to Date
          if (data.billDate) {
            data.billDate = new Date(data.billDate);
          }
          setPrefillData(data);
          // Clear after reading
          sessionStorage.removeItem("prefillExpenseData");
        }
      }
    } catch (e) {
      console.error("Failed to parse prefill data:", e);
    }
    setPrefillLoaded(true);
  }, [fromReimbursement]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="บันทึกรายการ"
        description="สร้างรายจ่ายหรือรายรับใหม่"
        icon={PenLine}
      />

      {fromReimbursement && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <ReceiptText className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            กำลังสร้างรายจ่ายจากคำขอเบิกจ่าย - ข้อมูลถูกกรอกให้อัตโนมัติ
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger
            value="expense"
            className="flex items-center gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
          >
            <ArrowUpCircle className="h-4 w-4" />
            จ่ายเงิน
          </TabsTrigger>
          <TabsTrigger
            value="income"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ArrowDownCircle className="h-4 w-4" />
            รับเงิน
          </TabsTrigger>
        </TabsList>

        <div ref={formContainerRef}>
          <TabsContent value="expense" className="mt-0">
            {prefillLoaded ? (
              <ExpenseForm 
                companyCode={companyCode} 
                prefillData={prefillData}
                key={fromReimbursement || "new"}
              />
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="income" className="mt-0">
            <IncomeForm companyCode={companyCode} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
