"use client";

import { use, useState } from "react";
import { ExpenseForm } from "@/components/forms/expense-form";

interface ExpenseDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <ExpenseForm
      companyCode={companyCode}
      mode={mode}
      transactionId={id}
      onModeChange={setMode}
    />
  );
}
