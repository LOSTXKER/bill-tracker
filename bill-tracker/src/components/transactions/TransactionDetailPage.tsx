"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";

// =============================================================================
// Types
// =============================================================================

export type TransactionType = "expense" | "income";

interface TransactionDetailPageProps {
  type: TransactionType;
  params: Promise<{ company: string; id: string }>;
}

// =============================================================================
// Component
// =============================================================================

export function TransactionDetailPage({ type, params }: TransactionDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const { data: session } = useSession();
  const [mode, setMode] = useState<"view" | "edit">("view");

  const FormComponent = type === "expense" ? ExpenseForm : IncomeForm;

  return (
    <FormComponent
      companyCode={companyCode}
      mode={mode}
      transactionId={id}
      onModeChange={setMode}
      currentUserId={session?.user?.id}
    />
  );
}
