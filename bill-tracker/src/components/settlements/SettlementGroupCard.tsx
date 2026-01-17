"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  User,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { SettlePaymentDialog } from "./SettlePaymentDialog";

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
}

export function SettlementGroupCard({
  group,
  companyCode,
  onSuccess,
}: SettlementGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
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

  return (
    <>
      <Card>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {group.payerName}
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      พนักงาน
                    </Badge>
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-semibold text-orange-600">
                    ฿{group.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.payments.length} รายการ
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSettleAll}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  โอนคืนทั้งหมด
                </Button>
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
            <CardContent className="pt-0">
              <div className="border rounded-lg divide-y">
                {group.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${companyCode}/expenses/${payment.Expense.id}`}
                          className="font-medium text-sm hover:underline truncate"
                        >
                          {payment.Expense.description || "ไม่ระบุรายละเอียด"}
                        </Link>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {payment.Expense.Contact && (
                          <span>{payment.Expense.Contact.name}</span>
                        )}
                        {payment.Expense.invoiceNumber && (
                          <>
                            <span>•</span>
                            <span>{payment.Expense.invoiceNumber}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(payment.Expense.billDate).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="font-medium">
                        ฿{Number(payment.amount).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
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
