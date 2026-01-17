"use client";

import { use, useState, useCallback } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  History,
  Settings,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface PettyCashPageProps {
  params: Promise<{ company: string }>;
}

interface PettyCashFund {
  id: string;
  name: string;
  initialAmount: number;
  currentAmount: number;
  lowThreshold: number | null;
  isActive: boolean;
  transactionCount: number;
  Custodian: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface Summary {
  totalFunds: number;
  activeFunds: number;
  totalBalance: number;
  lowBalanceFunds: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PettyCashPage({ params }: PettyCashPageProps) {
  const { company: companyCode } = use(params);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [replenishDialogOpen, setReplenishDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<PettyCashFund | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newFundName, setNewFundName] = useState("");
  const [newFundAmount, setNewFundAmount] = useState("");
  const [newFundThreshold, setNewFundThreshold] = useState("");
  const [replenishAmount, setReplenishAmount] = useState("");
  const [replenishDescription, setReplenishDescription] = useState("");

  // Fetch funds
  const { data, isLoading, mutate } = useSWR<{
    funds: PettyCashFund[];
    summary: Summary;
  }>(`/api/${companyCode}/petty-cash`, fetcher);

  const funds = data?.funds || [];
  const summary = data?.summary;

  // Create new fund
  const handleCreateFund = async () => {
    if (!newFundName || !newFundAmount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/${companyCode}/petty-cash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFundName,
          initialAmount: parseFloat(newFundAmount),
          lowThreshold: newFundThreshold ? parseFloat(newFundThreshold) : null,
        }),
      });

      if (response.ok) {
        mutate();
        setCreateDialogOpen(false);
        setNewFundName("");
        setNewFundAmount("");
        setNewFundThreshold("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Replenish fund
  const handleReplenish = async () => {
    if (!selectedFund || !replenishAmount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/${companyCode}/petty-cash/${selectedFund.id}/replenish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(replenishAmount),
            description: replenishDescription || "เติมเงินสดย่อย",
          }),
        }
      );

      if (response.ok) {
        mutate();
        setReplenishDialogOpen(false);
        setSelectedFund(null);
        setReplenishAmount("");
        setReplenishDescription("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReplenishDialog = (fund: PettyCashFund) => {
    setSelectedFund(fund);
    setReplenishDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="เงินสดย่อย"
          description="จัดการกองทุนเงินสดย่อยและติดตามยอดคงเหลือ"
        />
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          สร้างกองทุนใหม่
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">กองทุนทั้งหมด</p>
                  <p className="text-2xl font-bold">{summary.totalFunds}</p>
                  <p className="text-xs text-muted-foreground">
                    ใช้งาน {summary.activeFunds} กองทุน
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ยอดรวมคงเหลือ</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(summary.totalBalance)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {summary.lowBalanceFunds > 0 && (
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ยอดต่ำ</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {summary.lowBalanceFunds}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      กองทุนต้องเติมเงิน
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fund List */}
      {funds.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  ยังไม่มีกองทุนเงินสดย่อย
                </h3>
                <p className="text-muted-foreground mb-4">
                  สร้างกองทุนเงินสดย่อยเพื่อเริ่มต้นใช้งาน
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  สร้างกองทุนใหม่
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funds.map((fund) => {
            const isLow =
              fund.lowThreshold && fund.currentAmount <= fund.lowThreshold;
            const usagePercent =
              fund.initialAmount > 0
                ? ((fund.initialAmount - fund.currentAmount) /
                    fund.initialAmount) *
                  100
                : 0;

            return (
              <Card
                key={fund.id}
                className={`transition-all hover:shadow-md ${
                  isLow
                    ? "border-amber-300 dark:border-amber-700"
                    : ""
                } ${!fund.isActive ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {fund.name}
                        {!fund.isActive && (
                          <Badge variant="secondary">ปิดใช้งาน</Badge>
                        )}
                      </CardTitle>
                      {fund.Custodian && (
                        <p className="text-sm text-muted-foreground">
                          ผู้ดูแล: {fund.Custodian.name}
                        </p>
                      )}
                    </div>
                    {isLow && (
                      <Badge
                        variant="outline"
                        className="text-amber-600 border-amber-600"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        ยอดต่ำ
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm text-muted-foreground">
                        ยอดคงเหลือ
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          isLow ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(fund.currentAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          usagePercent > 80
                            ? "bg-red-500"
                            : usagePercent > 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>ใช้ไป {usagePercent.toFixed(0)}%</span>
                      <span>ตั้งต้น {formatCurrency(fund.initialAmount)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openReplenishDialog(fund)}
                      disabled={!fund.isActive}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      เติมเงิน
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        (window.location.href = `/${companyCode}/petty-cash/${fund.id}`)
                      }
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Fund Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างกองทุนเงินสดย่อยใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ชื่อกองทุน</label>
              <Input
                placeholder="เช่น เงินสดย่อยสำนักงาน"
                value={newFundName}
                onChange={(e) => setNewFundName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ยอดเงินตั้งต้น (บาท)</label>
              <Input
                type="number"
                placeholder="10000"
                value={newFundAmount}
                onChange={(e) => setNewFundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                ยอดขั้นต่ำที่ต้องเตือน (บาท) - ไม่บังคับ
              </label>
              <Input
                type="number"
                placeholder="2000"
                value={newFundThreshold}
                onChange={(e) => setNewFundThreshold(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreateFund}
              disabled={!newFundName || !newFundAmount || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              สร้างกองทุน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replenish Dialog */}
      <Dialog open={replenishDialogOpen} onOpenChange={setReplenishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เติมเงินสดย่อย</DialogTitle>
          </DialogHeader>
          {selectedFund && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedFund.name}</p>
                <p className="text-sm text-muted-foreground">
                  ยอดคงเหลือปัจจุบัน:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(selectedFund.currentAmount)}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">จำนวนเงินที่เติม (บาท)</label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={replenishAmount}
                  onChange={(e) => setReplenishAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <Input
                  placeholder="เช่น เติมเงินประจำเดือน"
                  value={replenishDescription}
                  onChange={(e) => setReplenishDescription(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplenishDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleReplenish}
              disabled={!replenishAmount || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              เติมเงิน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
