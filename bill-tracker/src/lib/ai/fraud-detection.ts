/**
 * AI Fraud Detection Service
 * ตรวจจับการโกงในการเบิกจ่ายพนักงาน
 */

import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/utils/logger";

export type { FraudFlag, FraudAnalysisResult } from "./fraud-types";
import type { FraudFlag, FraudAnalysisResult } from "./fraud-types";
import { checkPersonalExpenseKeywords, calculateOverallScore, getRecommendation } from "./fraud-heuristics";
import { checkFakeReceipt, checkPersonalExpenseAI } from "./fraud-ai-check";

const log = createLogger("fraud-detection");

// =============================================================================
// Main Function
// =============================================================================

export async function analyzeForFraud(
  companyId: string,
  data: {
    amount: number;
    description?: string;
    receiptUrls: string[];
    requesterId: string;
    invoiceNumber?: string;
    billDate: Date;
    accountId?: string;
  }
): Promise<FraudAnalysisResult> {
  const flags: FraudFlag[] = [];

  const [duplicateFlags, fakeReceiptFlags, personalExpenseAIFlags] = await Promise.all([
    checkDuplicateReceipt(companyId, data),
    checkFakeReceipt(data.receiptUrls),
    checkPersonalExpenseAI(data.description || "", data.receiptUrls),
  ]);

  flags.push(...duplicateFlags);
  flags.push(...fakeReceiptFlags);
  flags.push(...checkPersonalExpenseKeywords(data.description || ""));
  flags.push(...personalExpenseAIFlags);

  const overallScore = calculateOverallScore(flags);
  const recommendation = getRecommendation(overallScore);

  return {
    overallScore,
    flags,
    recommendation,
    analyzedAt: new Date(),
  };
}

// =============================================================================
// Duplicate Detection (DB-dependent)
// =============================================================================

async function checkDuplicateReceipt(
  companyId: string,
  data: {
    invoiceNumber?: string;
    amount: number;
    billDate: Date;
    requesterId: string;
    receiptUrls: string[];
  }
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  if (data.invoiceNumber) {
    const existingByInvoiceRaw = await prisma.expense.findFirst({
      where: {
        companyId,
        invoiceNumber: data.invoiceNumber,
        isReimbursement: true,
        deletedAt: null,
        reimbursementStatus: { not: "REJECTED" },
      },
      select: { id: true, billDate: true, netPaid: true, User_Expense_requesterIdToUser: { select: { name: true } } },
    });
    const existingByInvoice = existingByInvoiceRaw ? { ...existingByInvoiceRaw, requester: existingByInvoiceRaw.User_Expense_requesterIdToUser } : null;

    if (existingByInvoice) {
      flags.push({
        type: "DUPLICATE",
        severity: "HIGH",
        description: `พบใบเสร็จเลขที่ ${data.invoiceNumber} เคยถูกเบิกแล้ว`,
        confidence: 95,
      });
    }
  }

  const sevenDaysAgo = new Date(data.billDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const similarExpenses = await prisma.expense.findMany({
    where: {
      companyId,
      requesterId: data.requesterId,
      isReimbursement: true,
      netPaid: data.amount,
      billDate: {
        gte: sevenDaysAgo,
        lte: data.billDate,
      },
      deletedAt: null,
      reimbursementStatus: { not: "REJECTED" },
    },
    select: { id: true, billDate: true, description: true },
  });

  if (similarExpenses.length > 0) {
    flags.push({
      type: "DUPLICATE",
      severity: "MEDIUM",
      description: `พบรายการยอดเงินเท่ากัน ${similarExpenses.length} รายการใน 7 วันที่ผ่านมา`,
      confidence: 70,
    });
  }

  return flags;
}

// =============================================================================
// DB Persistence
// =============================================================================

export async function analyzeReimbursementRequest(
  requestId: string
): Promise<FraudAnalysisResult | null> {
  try {
    const request = await prisma.reimbursementRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        companyId: true,
        netAmount: true,
        description: true,
        receiptUrls: true,
        requesterName: true,
        invoiceNumber: true,
        billDate: true,
      },
    });

    if (!request) {
      return null;
    }

    const receiptUrls = Array.isArray(request.receiptUrls)
      ? (request.receiptUrls as string[])
      : [];

    const result = await analyzeForFraud(request.companyId, {
      amount: Number(request.netAmount),
      description: request.description || undefined,
      receiptUrls,
      requesterId: request.requesterName,
      invoiceNumber: request.invoiceNumber || undefined,
      billDate: request.billDate,
      accountId: undefined,
    });

    await prisma.reimbursementRequest.update({
      where: { id: requestId },
      data: {
        fraudScore: result.overallScore,
        fraudFlags: JSON.parse(JSON.stringify(result.flags)),
        fraudAnalyzedAt: result.analyzedAt,
      },
    });

    log.info("Fraud analysis completed", { requestId, score: result.overallScore, recommendation: result.recommendation });

    return result;
  } catch (error) {
    log.error("Error analyzing reimbursement request", error, { requestId });
    return null;
  }
}

export async function analyzeAndUpdateExpense(
  expenseId: string
): Promise<FraudAnalysisResult | null> {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        companyId: true,
        netPaid: true,
        description: true,
        slipUrls: true,
        requesterId: true,
        invoiceNumber: true,
        billDate: true,
        accountId: true,
        isReimbursement: true,
      },
    });

    if (!expense || !expense.isReimbursement) {
      return null;
    }

    const receiptUrls = Array.isArray(expense.slipUrls)
      ? (expense.slipUrls as string[])
      : [];

    const result = await analyzeForFraud(expense.companyId, {
      amount: Number(expense.netPaid),
      description: expense.description || undefined,
      receiptUrls,
      requesterId: expense.requesterId || "",
      invoiceNumber: expense.invoiceNumber || undefined,
      billDate: expense.billDate,
      accountId: expense.accountId || undefined,
    });

    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        fraudScore: result.overallScore,
        fraudFlags: JSON.parse(JSON.stringify(result.flags)),
        fraudAnalyzedAt: result.analyzedAt,
        ...(result.recommendation === "REJECT" && {
          reimbursementStatus: "FLAGGED",
        }),
      },
    });

    return result;
  } catch (error) {
    log.error("Error analyzing expense", error);
    return null;
  }
}
