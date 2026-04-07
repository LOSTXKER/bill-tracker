"use client";

import { use, useState } from "react";
import useSWR from "swr";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  SettlementTransferForm,
  type SettlementTransferData,
} from "@/components/settlement-transfers/SettlementTransferForm";
import { fetcher } from "@/lib/utils/fetcher";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  params: Promise<{ company: string; id: string }>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SettlementTransferDetailPage({ params }: Props) {
  const { company: companyCode, id } = use(params);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const { data: expenseRes, isLoading: loadingExpense, mutate } = useSWR<any>(
    `/api/expenses/${id}`,
    fetcher
  );

  const { data: paymentsRes, isLoading: loadingPayments, mutate: mutatePayments } = useSWR<any>(
    `/api/expenses/${id}/payments`,
    fetcher
  );

  const isLoading = loadingExpense || loadingPayments;
  const raw = expenseRes?.data?.expense;
  const rawPayments: any[] = paymentsRes?.data?.payments || [];

  const transfer: SettlementTransferData | undefined = raw
    ? {
        id: raw.id,
        description: raw.description ?? null,
        contactName: raw.contactName ?? null,
        amount: Number(raw.amount),
        netPaid: Number(raw.netPaid),
        billDate: typeof raw.billDate === "string" ? raw.billDate : "",
        notes: raw.notes ?? null,
        slipUrls: raw.slipUrls || [],
        workflowStatus: raw.workflowStatus,
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        creator: raw.User_Expense_createdByToUser ?? null,
        payments: rawPayments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          paidByType: p.paidByType,
          paidByUserId: p.paidByUserId ?? null,
          paidByUser: p.PaidByUser ?? null,
          settlementStatus: p.settlementStatus,
        })),
        category: raw.Category ?? null,
        account: raw.Account ?? null,
        categoryId: raw.categoryId ?? null,
        accountId: raw.accountId ?? null,
      }
    : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">
      <PageHeader
        icon={ArrowLeftRight}
        title={transfer?.contactName || "รายการโอนเงินคืน"}
        description="รายละเอียดรายการโอนเงินคืนพนักงาน"
        breadcrumb={{
          label: "รายการโอนเงินคืน",
          href: `/${companyCode}/reimbursements?tab=transfers`,
        }}
      />

      {isLoading ? (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="pt-4 border-t space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>
      ) : transfer ? (
        <SettlementTransferForm
          mode={mode}
          companyCode={companyCode}
          data={transfer}
          onModeChange={setMode}
          onSuccess={() => {
            mutate();
            mutatePayments();
          }}
        />
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          ไม่พบรายการ
        </div>
      )}
    </div>
  );
}
