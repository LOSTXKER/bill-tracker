"use client";

import React from "react";
import { Check, Clock, CreditCard, FileText, FileBadge, Send, CheckCircle2, Wallet, Receipt, FileCheck, FileEdit, FileX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovalStatus, ExpenseDocumentType } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

interface TimelineStepperProps {
  type: "expense" | "income";
  currentStatus: string;
  isWht?: boolean;
  approvalStatus?: ApprovalStatus;
  documentType?: ExpenseDocumentType;
  className?: string;
}

interface Step {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// =============================================================================
// Step Definitions
// =============================================================================

// =============================================================================
// Step Definitions (using schema-correct status keys)
// =============================================================================

// Tax invoice flow (VAT 7%)
const EXPENSE_STEPS: Step[] = [
  { key: "PAID", label: "จ่ายเงินแล้ว", icon: <CreditCard className="h-4 w-4" /> },
  { key: "TAX_INVOICE_RECEIVED", label: "ได้ใบกำกับ", icon: <FileText className="h-4 w-4" /> },
  { key: "WHT_ISSUED", label: "ออก 50 ทวิ", icon: <FileBadge className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const EXPENSE_STEPS_NO_WHT: Step[] = [
  { key: "PAID", label: "จ่ายเงินแล้ว", icon: <CreditCard className="h-4 w-4" /> },
  { key: "TAX_INVOICE_RECEIVED", label: "ได้ใบกำกับ", icon: <FileText className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

// Cash receipt flow (VAT 0% with receipt)
const EXPENSE_STEPS_CASH_RECEIPT: Step[] = [
  { key: "PAID", label: "จ่ายเงินแล้ว", icon: <CreditCard className="h-4 w-4" /> },
  { key: "TAX_INVOICE_RECEIVED", label: "ได้บิลเงินสด", icon: <Receipt className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

// Cash receipt flow with WHT (VAT 0% with receipt + withholding tax)
const EXPENSE_STEPS_CASH_RECEIPT_WHT: Step[] = [
  { key: "PAID", label: "จ่ายเงินแล้ว", icon: <CreditCard className="h-4 w-4" /> },
  { key: "TAX_INVOICE_RECEIVED", label: "ได้บิลเงินสด", icon: <Receipt className="h-4 w-4" /> },
  { key: "WHT_ISSUED", label: "ออก 50 ทวิ", icon: <FileBadge className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

// No document flow (VAT 0% without receipt)
const EXPENSE_STEPS_NO_DOCUMENT: Step[] = [
  { key: "PAID", label: "จ่ายเงินแล้ว", icon: <CreditCard className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

// No document flow with WHT (VAT 0% without receipt + withholding tax)
const EXPENSE_STEPS_NO_DOCUMENT_WHT: Step[] = [
  { key: "PAID", label: "จ่ายเงินแล้ว", icon: <CreditCard className="h-4 w-4" /> },
  { key: "WHT_ISSUED", label: "ออก 50 ทวิ", icon: <FileBadge className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const INCOME_STEPS: Step[] = [
  { key: "RECEIVED", label: "รับเงินแล้ว", icon: <Wallet className="h-4 w-4" /> },
  { key: "INVOICE_ISSUED", label: "ออกบิลแล้ว", icon: <Receipt className="h-4 w-4" /> },
  { key: "WHT_CERT_RECEIVED", label: "ได้ใบ 50 ทวิ", icon: <FileCheck className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const INCOME_STEPS_NO_WHT: Step[] = [
  { key: "RECEIVED", label: "รับเงินแล้ว", icon: <Wallet className="h-4 w-4" /> },
  { key: "INVOICE_ISSUED", label: "ออกบิลแล้ว", icon: <Receipt className="h-4 w-4" /> },
  { key: "READY_FOR_ACCOUNTING", label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" /> },
  { key: "SENT_TO_ACCOUNTANT", label: "ส่งบัญชีแล้ว", icon: <CheckCircle2 className="h-4 w-4" /> },
];

// Map workflow statuses to their display step (matches schema ExpenseWorkflowStatus/IncomeWorkflowStatus)
const STATUS_MAP: Record<string, string> = {
  // Expense workflow statuses (from ExpenseWorkflowStatus enum in schema)
  DRAFT: "DRAFT",
  PAID: "PAID",
  WAITING_TAX_INVOICE: "PAID", // Waiting = still in PAID step
  TAX_INVOICE_RECEIVED: "TAX_INVOICE_RECEIVED",
  WHT_PENDING_ISSUE: "TAX_INVOICE_RECEIVED", // Waiting = still in TAX_INVOICE_RECEIVED step
  WHT_ISSUED: "WHT_ISSUED",
  WHT_SENT_TO_VENDOR: "WHT_ISSUED", // After WHT issued
  READY_FOR_ACCOUNTING: "READY_FOR_ACCOUNTING",
  SENT_TO_ACCOUNTANT: "SENT_TO_ACCOUNTANT",
  COMPLETED: "SENT_TO_ACCOUNTANT",
  // Income workflow statuses (from IncomeWorkflowStatus enum in schema)
  RECEIVED: "RECEIVED",
  NO_INVOICE_NEEDED: "RECEIVED", // Skip invoice step
  WAITING_INVOICE_ISSUE: "RECEIVED", // Waiting = still in RECEIVED step
  INVOICE_ISSUED: "INVOICE_ISSUED",
  INVOICE_SENT: "INVOICE_ISSUED", // After invoice sent
  WHT_PENDING_CERT: "INVOICE_ISSUED", // Waiting for WHT cert
  WHT_CERT_RECEIVED: "WHT_CERT_RECEIVED",
};

// =============================================================================
// Component
// =============================================================================

export function TimelineStepper({
  type,
  currentStatus,
  isWht = false,
  approvalStatus,
  documentType,
  className,
}: TimelineStepperProps) {
  // Check if still in DRAFT status
  const isDraft = currentStatus === "DRAFT";
  
  // Get base steps based on type, WHT, and document type
  const getExpenseSteps = (): Step[] => {
    // For expenses, check document type and WHT
    if (documentType === "NO_DOCUMENT") {
      return isWht ? EXPENSE_STEPS_NO_DOCUMENT_WHT : EXPENSE_STEPS_NO_DOCUMENT;
    }
    if (documentType === "CASH_RECEIPT") {
      return isWht ? EXPENSE_STEPS_CASH_RECEIPT_WHT : EXPENSE_STEPS_CASH_RECEIPT;
    }
    // Default: TAX_INVOICE - check WHT
    return isWht ? EXPENSE_STEPS : EXPENSE_STEPS_NO_WHT;
  };
  
  const getIncomeSteps = (): Step[] => {
    return isWht ? INCOME_STEPS : INCOME_STEPS_NO_WHT;
  };
  
  const baseSteps = type === "expense" ? getExpenseSteps() : getIncomeSteps();

  // DRAFT step - always shown to display complete workflow history
  const draftStep: Step = {
    key: "DRAFT",
    label: isDraft && approvalStatus === "PENDING" ? "รออนุมัติ" : "ร่าง",
    icon: <FileEdit className="h-4 w-4" />,
  };
  
  // Always include DRAFT step at the beginning to show complete timeline
  const steps = [draftStep, ...baseSteps];

  // Map current status to step key
  const mappedStatus = STATUS_MAP[currentStatus] || currentStatus;
  
  // Find current step index
  const currentIndex = steps.findIndex(step => step.key === mappedStatus);
  
  // Check if waiting status (show clock icon)
  const isWaiting = currentStatus.includes("WAITING") || currentStatus.includes("PENDING") || approvalStatus === "PENDING";
  
  // Check if rejected
  const isRejected = approvalStatus === "REJECTED";

  return (
    <div className={cn(
      "py-3 sm:py-4",
      className
    )}>
      <div className="max-w-4xl mx-auto">
        {/* Desktop/Tablet View */}
        <div className="hidden sm:flex items-center">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <React.Fragment key={step.key}>
                {/* Step */}
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  {/* Circle */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      isCompleted && "bg-emerald-500 text-white",
                      isCurrent && !isWaiting && !isRejected && "bg-primary text-white ring-2 ring-primary/20",
                      isCurrent && isWaiting && !isRejected && "bg-amber-500 text-white ring-2 ring-amber-500/20",
                      isCurrent && isRejected && "bg-red-500 text-white ring-2 ring-red-500/20",
                      isPending && "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : isCurrent && isWaiting ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{step.icon}</span>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span
                    className={cn(
                      "text-xs font-medium text-center whitespace-nowrap",
                      isCompleted && "text-emerald-600 dark:text-emerald-400",
                      isCurrent && !isWaiting && !isRejected && "text-primary font-semibold",
                      isCurrent && isWaiting && !isRejected && "text-amber-600 dark:text-amber-400 font-semibold",
                      isCurrent && isRejected && "text-red-600 dark:text-red-400 font-semibold",
                      isPending && "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {isCurrent && isRejected ? "ถูกปฏิเสธ" : step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-1.5 h-0.5 min-w-[30px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        index < currentIndex 
                          ? "bg-emerald-500" 
                          : "bg-border"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile View */}
        <div className="sm:hidden">
          {/* Progress Bar */}
          <div className="relative mb-4">
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isRejected ? "bg-red-500" : isWaiting ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{
                  width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* Steps Dots */}
          <div className="flex justify-between items-start">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isPending = index > currentIndex;

              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      isCompleted && "bg-emerald-500 text-white",
                      isCurrent && !isWaiting && !isRejected && "bg-primary text-white ring-2 ring-primary/30",
                      isCurrent && isWaiting && !isRejected && "bg-amber-500 text-white ring-2 ring-amber-500/30",
                      isCurrent && isRejected && "bg-red-500 text-white ring-2 ring-red-500/30",
                      isPending && "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : isCurrent && isWaiting ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{step.icon}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium text-center leading-tight px-0.5",
                      isCompleted && "text-emerald-600 dark:text-emerald-400",
                      isCurrent && !isWaiting && !isRejected && "text-primary font-semibold",
                      isCurrent && isWaiting && !isRejected && "text-amber-600 dark:text-amber-400 font-semibold",
                      isCurrent && isRejected && "text-red-600 dark:text-red-400 font-semibold",
                      isPending && "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {isCurrent && isRejected ? "ปฏิเสธ" : step.label.split("แล้ว")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
