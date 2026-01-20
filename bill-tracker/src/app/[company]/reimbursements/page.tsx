"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { SettlementDashboard } from "@/components/settlements/SettlementDashboard";

interface SettlementsPageProps {
  params: Promise<{ company: string }>;
}

export default function SettlementsPage({ params }: SettlementsPageProps) {
  const { company: companyCode } = use(params);
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  return <SettlementDashboard companyCode={companyCode} filterUserId={userId} />;
}
