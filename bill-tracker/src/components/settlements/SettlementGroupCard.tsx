"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Landmark,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { SettlePaymentDialog } from "./SettlePaymentDialog";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";

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

interface Group {
  payerType: string;
  payerId: string | null;
  payerName: string;
  payerBankName: string | null;
  payerBankAccount: string | null;
  totalAmount: number;
  payments: Payment[];
}

interface SettlementGroupCardProps {
  group: Group;
  companyCode: string;
  onSuccess: () => void;
  compact?: boolean;
  monthLabel?: string;
}

export function SettlementGroupCard({
  group,
  companyCode,
  onSuccess,
  monthLabel,
}: SettlementGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  const handleSettleAll = () => {
    setSelectedPayments(group.payments.map((p) => p.id));
    setShowSettleDialog(true);
  };

  const handleSettleSingle = (paymentId: string) => {
    setSelectedPayments([paymentId]);
    setShowSettleDialog(true);
  };

  const initials = (group.payerName || "?").charAt(0).toUpperCase();
  const hasBankInfo = group.payerBankName || group.payerBankAccount;

  return (
    <>
      <Card className="border-border/50 shadow-card transition-all duration-200 hover:shadow-md">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">
                      {group.payerName}
                    </span>
                    {monthLabel && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal text-muted-foreground shrink-0">
                        <Calendar className="h-2.5 w-2.5" />
                        {monthLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{group.payments.length} รายการ</span>
                    {hasBankInfo && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 truncate">
                          <Landmark className="h-3 w-3 shrink-0" />
                          {group.payerBankName}
                          {group.payerBankAccount && ` ${group.payerBankAccount}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-semibold text-base tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(group.totalAmount)}
                </p>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSettleAll();
                  }}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  โอนคืนทั้งหมด
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
            <CardContent className="pt-0">
              <div className="border rounded-lg divide-y">
                {group.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/${companyCode}/expenses/${payment.Expense.id}`}
                          className="font-medium text-sm hover:underline truncate"
                        >
                          {payment.Expense.description || "ไม่ระบุรายละเอียด"}
                        </Link>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        {payment.Expense.Contact && (
                          <span>{payment.Expense.Contact.name}</span>
                        )}
                        {payment.Expense.invoiceNumber && (
                          <>
                            <span>·</span>
                            <span>{payment.Expense.invoiceNumber}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>
                          {formatThaiDate(new Date(payment.Expense.billDate))}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 ml-4">
                      <span className="font-medium text-sm tabular-nums">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleSettleSingle(payment.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        โอนคืน
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <SettlePaymentDialog
        isOpen={showSettleDialog}
        onClose={() => {
          setShowSettleDialog(false);
          setSelectedPayments([]);
        }}
        companyCode={companyCode}
        paymentIds={selectedPayments}
        payerName={group.payerName}
        totalAmount={
          selectedPayments.length === group.payments.length
            ? group.totalAmount
            : group.payments
                .filter((p) => selectedPayments.includes(p.id))
                .reduce((sum, p) => sum + Number(p.amount), 0)
        }
        onSuccess={onSuccess}
        isBatch={selectedPayments.length > 1}
      />
    </>
  );
}
