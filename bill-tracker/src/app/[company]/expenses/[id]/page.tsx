"use client";

import { TransactionDetailPage } from "@/components/transactions";

interface ExpenseDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  return <TransactionDetailPage type="expense" params={params} />;
}
