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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          บันทึกรายการ
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          บันทึกรายรับหรือรายจ่ายพร้อมคำนวณภาษีอัตโนมัติ
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "expense" | "income")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="expense"
            className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white"
          >
            <ArrowUpCircle className="h-4 w-4" />
            จ่ายเงิน
          </TabsTrigger>
          <TabsTrigger
            value="income"
            className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
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
