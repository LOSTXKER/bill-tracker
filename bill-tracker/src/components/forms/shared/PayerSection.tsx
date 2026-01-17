"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Wallet,
  User,
  Plus,
  X,
  Calculator,
  Loader2,
} from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

// EXTERNAL removed - all payers must have user accounts
export type PaidByType = "COMPANY" | "PETTY_CASH" | "USER";

export interface PayerInfo {
  paidByType: PaidByType;
  paidByUserId?: string | null;
  paidByName?: string | null; // Display name (auto-filled from user)
  paidByPettyCashFundId?: string | null; // For PETTY_CASH type
  paidByPettyCashFundName?: string | null; // Display name (auto-filled from fund)
  amount: number;
  // Optional settlement info (for pre-settled payments from reimbursement)
  settlementStatus?: "NOT_REQUIRED" | "PENDING" | "SETTLED";
  settledAt?: string | null;
  settlementRef?: string | null;
}

export interface PayerSectionProps {
  companyCode: string;
  totalAmount: number;
  mode: "create" | "view" | "edit";
  payers: PayerInfo[];
  onPayersChange: (payers: PayerInfo[]) => void;
  disabled?: boolean;
}

interface Member {
  id: string;
  User: {
    id: string;
    name: string;
    email: string;
  };
}

interface PettyCashFund {
  id: string;
  name: string;
  currentAmount: number;
  isActive: boolean;
}

// =============================================================================
// Fetcher
// =============================================================================

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// =============================================================================
// Payer Type Options
// =============================================================================

const PAYER_TYPE_OPTIONS = [
  {
    value: "COMPANY" as const,
    label: "บัญชีบริษัท",
    icon: Building2,
    description: "ไม่ต้องโอนคืน",
    color: "text-blue-600",
  },
  {
    value: "PETTY_CASH" as const,
    label: "เงินสดย่อย",
    icon: Wallet,
    description: "ไม่ต้องโอนคืน",
    color: "text-green-600",
  },
  {
    value: "USER" as const,
    label: "พนักงาน",
    icon: User,
    description: "ต้องโอนคืน",
    color: "text-orange-600",
  },
];

// =============================================================================
// Component
// =============================================================================

export function PayerSection({
  companyCode,
  totalAmount,
  mode,
  payers,
  onPayersChange,
  disabled = false,
}: PayerSectionProps) {
  const [isSharedPayment, setIsSharedPayment] = useState(payers.length > 1);
  
  // Fetch company members
  const { data: membersData, isLoading: membersLoading } = useSWR(
    companyCode ? `/api/companies/${companyCode}/members` : null,
    fetcher
  );
  
  // Fetch petty cash funds
  const { data: fundsData, isLoading: fundsLoading } = useSWR(
    companyCode ? `/api/${companyCode}/petty-cash` : null,
    fetcher
  );
  
  const members: Member[] = membersData?.data?.members || [];
  const pettyCashFunds: PettyCashFund[] = (fundsData?.funds || []).filter(
    (f: PettyCashFund) => f.isActive
  );

  // Update amounts when total changes (only for single payer)
  useEffect(() => {
    if (payers.length === 1 && payers[0].amount !== totalAmount) {
      onPayersChange([{ ...payers[0], amount: totalAmount }]);
    }
  }, [totalAmount, payers, onPayersChange]);

  const handlePayerTypeChange = (index: number, type: PaidByType) => {
    const newPayers = [...payers];
    newPayers[index] = {
      ...newPayers[index],
      paidByType: type,
      paidByUserId: null,
      paidByName: null,
      paidByPettyCashFundId: null,
      paidByPettyCashFundName: null,
    };
    onPayersChange(newPayers);
  };

  const handleUserSelect = (index: number, userId: string) => {
    const member = members.find((m) => m.User.id === userId);
    const newPayers = [...payers];
    newPayers[index] = {
      ...newPayers[index],
      paidByUserId: userId,
      paidByName: member?.User.name || null,
    };
    onPayersChange(newPayers);
  };

  const handlePettyCashFundSelect = (index: number, fundId: string) => {
    const fund = pettyCashFunds.find((f) => f.id === fundId);
    const newPayers = [...payers];
    newPayers[index] = {
      ...newPayers[index],
      paidByPettyCashFundId: fundId,
      paidByPettyCashFundName: fund?.name || null,
    };
    onPayersChange(newPayers);
  };

  const handleAmountChange = (index: number, amount: number) => {
    const newPayers = [...payers];
    newPayers[index] = {
      ...newPayers[index],
      amount,
    };
    onPayersChange(newPayers);
  };

  const handleAddPayer = () => {
    // Calculate remaining amount
    const usedAmount = payers.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, totalAmount - usedAmount);
    
    onPayersChange([
      ...payers,
      {
        paidByType: "USER",
        amount: remaining,
      },
    ]);
  };

  const handleRemovePayer = (index: number) => {
    if (payers.length <= 1) return;
    
    const newPayers = payers.filter((_, i) => i !== index);
    
    // If only one payer left, set amount to total
    if (newPayers.length === 1) {
      newPayers[0].amount = totalAmount;
      setIsSharedPayment(false);
    }
    
    onPayersChange(newPayers);
  };

  const handleSplitEqually = () => {
    if (payers.length === 0) return;
    
    const baseAmount = Math.floor((totalAmount / payers.length) * 100) / 100;
    const remainder = totalAmount - baseAmount * payers.length;
    
    const newPayers = payers.map((p, i) => ({
      ...p,
      amount: i === 0 ? baseAmount + remainder : baseAmount,
    }));
    
    onPayersChange(newPayers);
  };

  const handleToggleSharedPayment = (shared: boolean) => {
    setIsSharedPayment(shared);
    
    if (!shared && payers.length > 1) {
      // Keep only the first payer
      onPayersChange([{ ...payers[0], amount: totalAmount }]);
    }
  };

  // Calculate total assigned
  const totalAssigned = payers.reduce((sum, p) => sum + p.amount, 0);
  const isBalanced = Math.abs(totalAssigned - totalAmount) < 0.01;

  const isViewMode = mode === "view";
  const isDisabled = disabled || isViewMode;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            ผู้จ่ายเงิน
          </CardTitle>
          {!isViewMode && (
            <div className="flex items-center gap-2">
              <Label htmlFor="shared-payment" className="text-sm text-muted-foreground">
                แชร์จ่าย
              </Label>
              <Switch
                id="shared-payment"
                checked={isSharedPayment}
                onCheckedChange={handleToggleSharedPayment}
                disabled={isDisabled}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empty State - No payers yet */}
        {payers.length === 0 && !isViewMode && (
          <div className="space-y-3">
            <Label className="text-sm">ประเภทผู้จ่าย</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYER_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  onClick={() => onPayersChange([{ paidByType: option.value, amount: totalAmount }])}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <option.icon className={`h-5 w-5 ${option.color}`} />
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {payers.map((payer, index) => (
          <div
            key={index}
            className="space-y-3"
          >
            {isSharedPayment && (
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  ผู้จ่าย #{index + 1}
                </Badge>
                {payers.length > 1 && !isDisabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemovePayer(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Payer Type Selector - Button Style */}
            <div className="space-y-2">
              <Label className="text-sm">ประเภทผู้จ่าย</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYER_TYPE_OPTIONS.map((option) => {
                  const isSelected = payer.paidByType === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handlePayerTypeChange(index, option.value)}
                      disabled={isDisabled}
                      className={cn(
                        "flex flex-col items-center gap-1 h-auto py-3",
                        isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <option.icon className={`h-5 w-5 ${isSelected ? "text-primary-foreground" : option.color}`} />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* User Selector (for USER type) */}
            {payer.paidByType === "USER" && (
              <div className="space-y-2">
                <Label className="text-sm">พนักงาน</Label>
                {membersLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังโหลด...</span>
                  </div>
                ) : (
                  <Select
                    value={payer.paidByUserId || ""}
                    onValueChange={(value) => handleUserSelect(index, value)}
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกพนักงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.User.id} value={member.User.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{member.User.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({member.User.email})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Petty Cash Fund Selector (for PETTY_CASH type) */}
            {payer.paidByType === "PETTY_CASH" && (
              <div className="space-y-2">
                <Label className="text-sm">กองทุนเงินสดย่อย</Label>
                {fundsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังโหลด...</span>
                  </div>
                ) : pettyCashFunds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ยังไม่มีกองทุนเงินสดย่อย
                  </p>
                ) : (
                  <Select
                    value={payer.paidByPettyCashFundId || ""}
                    onValueChange={(value) => handlePettyCashFundSelect(index, value)}
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกกองทุน" />
                    </SelectTrigger>
                    <SelectContent>
                      {pettyCashFunds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <span>{fund.name}</span>
                            <span className="text-xs text-muted-foreground">
                              (คงเหลือ ฿{fund.currentAmount.toLocaleString()})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Amount (for shared payment) */}
            {isSharedPayment && (
              <div className="space-y-2">
                <Label className="text-sm">จำนวนเงิน</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={payer.amount || ""}
                    onChange={(e) =>
                      handleAmountChange(index, parseFloat(e.target.value) || 0)
                    }
                    className="pr-12"
                    disabled={isDisabled}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    บาท
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Payer & Split Equally Buttons */}
        {isSharedPayment && !isDisabled && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPayer}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              เพิ่มผู้จ่าย
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSplitEqually}
              className="gap-1"
            >
              <Calculator className="h-4 w-4" />
              หารเท่าๆ กัน
            </Button>
          </div>
        )}

        {/* Balance Summary */}
        {isSharedPayment && (
          <div
            className={`flex items-center justify-between p-2 rounded-lg text-sm ${
              isBalanced
                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
            }`}
          >
            <span>ยอดรวมที่ระบุ:</span>
            <span className="font-medium">
              ฿{totalAssigned.toLocaleString("th-TH", { minimumFractionDigits: 2 })} / ฿
              {totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Settlement Notice */}
        {payers.some((p) => p.paidByType === "USER") && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            รายการที่จ่ายโดยพนักงาน จะปรากฏในหน้า "โอนคืนเงิน"
            เพื่อติดตามการโอนคืน
          </div>
        )}
      </CardContent>
    </Card>
  );
}
