"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { SettlementDashboard } from "@/components/settlements/SettlementDashboard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ArrowLeftRight } from "lucide-react";

interface SettlementsPageProps {
  params: Promise<{ company: string }>;
}

export default function SettlementsPage({ params }: SettlementsPageProps) {
  const { company: companyCode } = use(params);
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  return (
    <div className="space-y-6">
      <PageHeader
        title="โอนคืนพนักงาน"
        description="จัดการรายการโอนเงินคืนพนักงาน"
        icon={ArrowLeftRight}
      />
      <SettlementDashboard companyCode={companyCode} filterUserId={userId} />
    </div>
  );
}
