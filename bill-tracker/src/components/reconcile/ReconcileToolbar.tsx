"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Zap,
  Loader2,
  RotateCcw,
  Search,
  Receipt,
  Save,
  ArrowLeft,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CompanyFilter } from "./CompanyFilter";
import type { SiblingCompany, SavedSession } from "./reconcile-types";
import { MONTHS } from "./reconcile-types";
import type { ReconcileSessionReturn } from "./useReconcileSession";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReconcileSessionType } from "@prisma/client";

interface ReconcileToolbarProps {
  session: ReconcileSessionReturn;
  companyCode: string;
  year: number;
  month: number;
  type: ReconcileSessionType;
  savedSession?: SavedSession;
  siblingCompanies?: SiblingCompany[];
  selectedCompanyCodes?: string[];
  router: AppRouterInstance;
}

export function ReconcileToolbar({
  session,
  year,
  month,
  type,
  savedSession,
  siblingCompanies,
  selectedCompanyCodes,
  router,
}: ReconcileToolbarProps) {
  const {
    hasAccountingData,
    accountingItems,
    sourceFileName,
    vatOnly,
    setVatOnly,
    hiddenByVatFilter,
    searchQuery,
    setSearchQuery,
    hasSiblings,
    lastSaved,
    isAILoading,
    canAIMatch,
    unmatchedSystemCount,
    unmatchedAccountingCount,
    isSaving,
    canSave,
    matchedPairsForSave,
    setShowImport,
    handleAIMatch,
    handleSave,
    handleBack,
    handleReset,
    setPairs,
    setAccountingItems,
  } = session;

  const monthName = MONTHS[month - 1];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <h2 className="text-base font-semibold flex-shrink-0">
        {type === "EXPENSE" ? "ภาษีซื้อ" : type === "INCOME" ? "ภาษีขาย" : "ภพ.36"}{" "}
        {monthName} {year + 543}
      </h2>
      {savedSession && (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            savedSession.status === "COMPLETED"
              ? "text-emerald-600 border-emerald-200"
              : "text-amber-600 border-amber-200"
          )}
        >
          {savedSession.status === "COMPLETED" ? "เสร็จสิ้น" : "กำลังทำ"}
        </Badge>
      )}

      {hasAccountingData ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <FileText className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium text-foreground max-w-[120px] truncate">
            {sourceFileName || "ไฟล์"}
          </span>
          <span>({accountingItems.length})</span>
          <button
            className="text-primary hover:underline ml-0.5"
            onClick={() => setShowImport(true)}
          >
            เปลี่ยน
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs flex-shrink-0"
          onClick={() => setShowImport(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          นำเข้ารายงาน
        </Button>
      )}

      <div className="h-5 w-px bg-border mx-0.5 flex-shrink-0" />

      {hasSiblings && siblingCompanies && (
        <CompanyFilter
          siblingCompanies={siblingCompanies}
          selectedCompanyCodes={selectedCompanyCodes}
          router={router}
        />
      )}

      <Button
        variant={vatOnly ? "default" : "outline"}
        size="sm"
        className="h-8 gap-1 text-xs flex-shrink-0"
        onClick={() => {
          setVatOnly((v: boolean) => !v);
          setPairs([]);
          setAccountingItems([]);
        }}
        title="กรองเฉพาะรายการที่มี VAT"
      >
        <Receipt className="h-3.5 w-3.5" />
        VAT
        {vatOnly && hiddenByVatFilter > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1 h-4">
            {hiddenByVatFilter}
          </Badge>
        )}
      </Button>

      <div className="relative flex-shrink-0">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหา..."
          className="h-8 pl-7 w-32 text-xs"
        />
      </div>

      <div className="flex-1 min-w-0" />

      {lastSaved && (
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          {lastSaved.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}

      {hasAccountingData && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs flex-shrink-0"
            onClick={handleAIMatch}
            disabled={!canAIMatch || isAILoading}
          >
            {isAILoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            )}
            AI จับคู่
            {canAIMatch && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {unmatchedSystemCount + unmatchedAccountingCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            className="gap-1.5 h-8 text-xs flex-shrink-0"
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            บันทึก
            {matchedPairsForSave.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {matchedPairsForSave.length}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                รีเซ็ต
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowImport(true)}>
                <Upload className="h-3.5 w-3.5 mr-2" />
                โหลดไฟล์ใหม่
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
