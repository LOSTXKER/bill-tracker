"use client";

import { use, useState } from "react";
import { IncomeForm } from "@/components/forms/income-form";

interface IncomeDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

export default function IncomeDetailPage({ params }: IncomeDetailPageProps) {
  const { company: companyCode, id } = use(params);
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <IncomeForm
      companyCode={companyCode}
      mode={mode}
      transactionId={id}
      onModeChange={setMode}
    />
  );
}
