"use client";

import { use } from "react";
import { SettlementDashboard } from "@/components/settlements/SettlementDashboard";

interface SettlementsPageProps {
  params: Promise<{ company: string }>;
}

export default function SettlementsPage({ params }: SettlementsPageProps) {
  const { company: companyCode } = use(params);

  return <SettlementDashboard companyCode={companyCode} />;
}
