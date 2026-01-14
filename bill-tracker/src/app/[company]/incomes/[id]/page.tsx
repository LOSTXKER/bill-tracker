"use client";

import { TransactionDetailPage } from "@/components/transactions";

interface IncomeDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

export default function IncomeDetailPage({ params }: IncomeDetailPageProps) {
  return <TransactionDetailPage type="income" params={params} />;
}
