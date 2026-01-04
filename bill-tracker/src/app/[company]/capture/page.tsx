"use client";

import { useState, use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";

interface CapturePageProps {
  params: Promise<{ company: string }>;
}

export default function CapturePage({ params }: CapturePageProps) {
  const { company: companyCode } = use(params);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          บันทึกรายการ
        </h1>
        <p className="text-muted-foreground">
          บันทึกรายรับหรือรายจ่ายพร้อมคำนวณภาษีอัตโนมัติ
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "expense" | "income")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
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

        <TabsContent value="expense" className="mt-0">
          <ExpenseForm companyCode={companyCode} />
        </TabsContent>

        <TabsContent value="income" className="mt-0">
          <IncomeForm companyCode={companyCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
