"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { SettlementGroupCard } from "./SettlementGroupCard";

interface Payment {
  id: string;
  amount: number;
  paidByType: string;
  paidByUserId: string | null;
  paidByName: string | null;
  paidByBankName: string | null;
  paidByBankAccount: string | null;
  settlementStatus: string;
  Expense: {
    id: string;
    description: string | null;
    billDate: string;
    netPaid: number;
    invoiceNumber: string | null;
    Contact: {
      id: string;
      name: string;
    } | null;
  };
  PaidByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PayerGroup {
  payerType: string;
  payerId: string | null;
  payerName: string;
  payerBankName: string | null;
  payerBankAccount: string | null;
  totalAmount: number;
  payments: Payment[];
}

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  totalAmount: number;
  payerGroups: PayerGroup[];
}

interface PendingMonthSectionProps {
  monthGroup: MonthGroup;
  companyCode: string;
  onSuccess: () => void;
  defaultExpanded?: boolean;
}

export function PendingMonthSection({
  monthGroup,
  companyCode,
  onSuccess,
  defaultExpanded = true,
}: PendingMonthSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const totalItems = monthGroup.payerGroups.reduce(
    (sum, group) => sum + group.payments.length,
    0
  );

  return (
    <Card className="border-l-4 border-l-blue-500">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{monthGroup.monthLabel}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {monthGroup.payerGroups.length} พนักงาน • {totalItems} รายการ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xl font-semibold text-orange-600">
                  ฿{monthGroup.totalAmount.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {monthGroup.payerGroups.map((group, index) => (
              <SettlementGroupCard
                key={`${group.payerType}_${group.payerId || group.payerName}_${index}`}
                group={group}
                companyCode={companyCode}
                onSuccess={onSuccess}
                compact
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
