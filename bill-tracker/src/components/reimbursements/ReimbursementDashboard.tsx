"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  Receipt,
  CreditCard,
  BarChart3,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import type { ReimbursementTab } from "@/types/reimbursement";
import { useReimbursementDashboard } from "@/hooks/use-reimbursement-dashboard";
import { ReimbursementCard } from "./ReimbursementCard";
import { ReimbursementSheet } from "./ReimbursementSheet";
import { BatchPayDialog } from "./ReimbursementActions";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface ReimbursementDashboardProps {
  companyCode: string;
}

export function ReimbursementDashboard({ companyCode }: ReimbursementDashboardProps) {
  const router = useRouter();
  const [batchPayDialogOpen, setBatchPayDialogOpen] = useState(false);

  const {
    reimbursements,
    summary,
    isLoading,
    filters,
    setTab,
    setSearch,
    selectedId,
    setSelectedId,
    selectedItems,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    selectedTotal,
    processingIds,
    isProcessing,
    approve,
    reject,
    pay,
    batchPay,
  } = useReimbursementDashboard({
    companyCode,
    autoRefresh: false,
  });

  const handleApprove = async (id: string) => {
    return await approve(id);
  };

  const handleReject = async (id: string, reason: string) => {
    return await reject({ id, reason });
  };

  const handlePay = async (id: string, paymentRef: string, paymentMethod: string) => {
    return await pay({ id, paymentRef, paymentMethod });
  };

  const handleBatchPay = async (paymentRef: string, paymentMethod: string) => {
    const success = await batchPay(Array.from(selectedItems), paymentRef, paymentMethod);
    if (success) {
      setBatchPayDialogOpen(false);
    }
  };

  const handleCardClick = (id: string) => {
    setSelectedId(id);
  };

  const handleTabClick = (tab: ReimbursementTab) => {
    setTab(tab);
    clearSelection();
  };

  // Show checkbox for approved items
  const showCheckbox = filters.tab === "approved";
  const showBatchActions = showCheckbox && selectedItems.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="เบิกจ่ายพนักงาน"
        description="จัดการคำขอเบิกจ่ายแบบ Anonymous"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/${companyCode.toLowerCase()}/reimbursements/reports`)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">รายงาน</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/reimburse/${companyCode.toLowerCase()}`)}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">ลิงก์ส่งคำขอ</span>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      {summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card
            className={`
              cursor-pointer transition-all hover:shadow-md
              ${filters.tab === "pending" ? "ring-2 ring-primary" : ""}
              bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 
              border-amber-200 dark:border-amber-800
            `}
            onClick={() => handleTabClick("pending")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">รออนุมัติ</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {summary.pendingApproval.count + summary.flagged.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.pendingApproval.amount + summary.flagged.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`
              cursor-pointer transition-all hover:shadow-md
              ${filters.tab === "approved" ? "ring-2 ring-primary" : ""}
              bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 
              border-blue-200 dark:border-blue-800
            `}
            onClick={() => handleTabClick("approved")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">รอจ่ายเงิน</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {summary.pendingPayment.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.pendingPayment.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`
              cursor-pointer transition-all hover:shadow-md
              ${filters.tab === "completed" ? "ring-2 ring-primary" : ""}
            `}
            onClick={() => handleTabClick("completed")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">จ่ายแล้ว</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {summary.paid.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.paid.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ถูกปฏิเสธ</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {summary.rejected.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.rejected.amount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/30">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs
          value={filters.tab}
          onValueChange={(value) => handleTabClick(value as ReimbursementTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="pending">
              <span className="hidden sm:inline">รออนุมัติ</span>
              <span className="sm:hidden">รออนุมัติ</span>
            </TabsTrigger>
            <TabsTrigger value="approved">
              <span className="hidden sm:inline">รอจ่าย</span>
              <span className="sm:hidden">รอจ่าย</span>
            </TabsTrigger>
            <TabsTrigger value="completed">
              <span className="hidden sm:inline">เสร็จสิ้น</span>
              <span className="sm:hidden">เสร็จ</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Batch Actions */}
      {showBatchActions && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedItems.size === reimbursements.length && reimbursements.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="font-medium">
                  เลือก {selectedItems.size} รายการ
                </span>
                <span className="text-sm text-muted-foreground">
                  รวม {formatCurrency(selectedTotal)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setBatchPayDialogOpen(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  จ่ายเงิน ({selectedItems.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reimbursement List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reimbursements.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {filters.search
                      ? "ไม่พบรายการที่ค้นหา"
                      : filters.tab === "all"
                      ? "ยังไม่มีรายการเบิกจ่าย"
                      : "ไม่มีรายการในหมวดนี้"}
                  </h3>
                  <p className="text-muted-foreground">
                    {filters.tab === "all" && "พนักงานสามารถส่งคำขอเบิกผ่านลิงก์สาธารณะได้"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          reimbursements.map((reimbursement) => (
            <ReimbursementCard
              key={reimbursement.id}
              reimbursement={reimbursement}
              isSelected={selectedItems.has(reimbursement.id)}
              isProcessing={isProcessing(reimbursement.id)}
              showCheckbox={showCheckbox && reimbursement.status === "APPROVED"}
              showActions={!showCheckbox}
              onSelect={() => toggleSelection(reimbursement.id)}
              onClick={() => handleCardClick(reimbursement.id)}
              onApprove={() => handleApprove(reimbursement.id)}
              onReject={() => {
                setSelectedId(reimbursement.id);
              }}
              onPay={() => {
                setSelectedId(reimbursement.id);
              }}
            />
          ))
        )}
      </div>

      {/* Detail Sheet */}
      <ReimbursementSheet
        reimbursementId={selectedId}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onPay={handlePay}
        companyCode={companyCode}
      />

      {/* Batch Pay Dialog */}
      <BatchPayDialog
        open={batchPayDialogOpen}
        onOpenChange={setBatchPayDialogOpen}
        selectedCount={selectedItems.size}
        selectedTotal={selectedTotal}
        isProcessing={processingIds.size > 0}
        onConfirm={handleBatchPay}
      />
    </div>
  );
}
