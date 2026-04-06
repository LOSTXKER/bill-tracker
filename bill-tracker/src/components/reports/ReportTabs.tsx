"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Calculator, FileText } from "lucide-react";

interface ReportTabsProps {
  currentTab: string;
  children: React.ReactNode;
}

export function ReportTabs({ currentTab, children }: ReportTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
        <TabsTrigger value="overview" className="gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">ภาพรวม</span>
        </TabsTrigger>
        <TabsTrigger value="vat" className="gap-2">
          <Calculator className="h-4 w-4" />
          <span className="hidden sm:inline">VAT</span>
        </TabsTrigger>
        <TabsTrigger value="wht" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">หัก ณ ที่จ่าย</span>
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
