import { prisma } from "@/lib/db";
import { analyzeImage } from "./gemini";
import { createLogger } from "@/lib/utils/logger";
import { buildSmartPrompt } from "./receipt-prompts";
import { parseAIResponse, createEmptyResult } from "./receipt-normalizer";

const log = createLogger("ai-receipt");

import type {
  ReceiptAnalysisInput,
  AnalyzedVendor,
  AnalyzedAccount,
  AccountAlternative,
  AnalyzedWHT,
  ConfidenceScores,
  AnalysisWarning,
  ReceiptAnalysisResult,
} from "./types";

export type {
  ReceiptAnalysisInput,
  AnalyzedVendor,
  AnalyzedAccount,
  AccountAlternative,
  AnalyzedWHT,
  ConfidenceScores,
  AnalysisWarning,
  ReceiptAnalysisResult,
};

// =============================================================================
// Main Function
// =============================================================================

export async function analyzeReceipt(
  input: ReceiptAnalysisInput
): Promise<ReceiptAnalysisResult | { error: string }> {
  const { imageUrls, companyId, transactionType } = input;

  if (!imageUrls || imageUrls.length === 0) {
    return { error: "ไม่มีรูปภาพ" };
  }

  try {
    const [accounts, contacts, company] = await Promise.all([
      fetchAccounts(companyId, transactionType),
      fetchContacts(companyId),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, legalName: true, taxId: true },
      }),
    ]);

    if (accounts.length === 0) {
      return { error: "ไม่มีผังบัญชีในระบบ กรุณา Import จาก Peak ก่อน" };
    }

    log.debug("AI Context", {
      accountsCount: accounts.length,
      contactsCount: contacts.length,
      transactionType,
      company: company?.name,
    });
    const prompt = buildSmartPrompt(accounts, contacts, transactionType, company);

    const analysisPromises = imageUrls.map(async (url) => {
      const response = await analyzeImage(url, prompt, {
        temperature: 0.1,
        maxTokens: 4096,
      });
      if (response.error) {
        log.error("AI analysis error", response.error, { url });
        return null;
      }
      log.debug("AI raw response", { preview: response.data.substring(0, 300) });
      return parseAIResponse(response.data, accounts, contacts, company?.taxId);
    });

    const results = await Promise.all(analysisPromises);
    const validResults = results.filter((r): r is ReceiptAnalysisResult => r !== null);

    if (validResults.length === 0) {
      return { error: "AI ไม่สามารถวิเคราะห์ได้" };
    }

    if (validResults.length === 1) {
      return validResults[0];
    }

    return combineResults(validResults);

  } catch (error) {
    log.error("analyzeReceipt error", error);
    return { error: "เกิดข้อผิดพลาดในการวิเคราะห์" };
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchAccounts(companyId: string, transactionType: "EXPENSE" | "INCOME") {
  const accountClasses = transactionType === "EXPENSE"
    ? ["COST_OF_SALES", "EXPENSE", "OTHER_EXPENSE"]
    : ["REVENUE", "OTHER_INCOME"];

  return prisma.account.findMany({
    where: {
      companyId,
      class: { in: accountClasses as any },
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
    orderBy: { code: "asc" },
  });
}

async function fetchContacts(companyId: string) {
  return prisma.contact.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      taxId: true,
    },
    orderBy: { name: "asc" },
  });
}

// =============================================================================
// Combine Multiple Results - Priority-Based (Not Sum)
// =============================================================================

function combineResults(results: ReceiptAnalysisResult[]): ReceiptAnalysisResult {
  const warnings: AnalysisWarning[] = [];

  const invoices = results.filter(r =>
    r.documentType === "TAX_INVOICE" || r.documentType === "RECEIPT"
  );
  const slips = results.filter(r => r.documentType === "BANK_SLIP");
  const whtCerts = results.filter(r => r.documentType === "WHT_CERT");
  const others = results.filter(r =>
    !["TAX_INVOICE", "RECEIPT", "BANK_SLIP", "WHT_CERT"].includes(r.documentType || "")
  );

  const primaryDoc = invoices[0] || slips[0] || others[0] || results[0];

  if (!primaryDoc) {
    return createEmptyResult();
  }

  if (invoices.length > 1) {
    const vendorNames = [...new Set(invoices.map(i => i.vendor?.name).filter(Boolean))];
    if (vendorNames.length > 1) {
      warnings.push({
        type: "multiple_invoices",
        message: `พบใบกำกับ ${invoices.length} ใบ จากคนละร้าน - ควรสร้างแยกรายการ`,
        severity: "warning",
      });
    }
  }

  const result: ReceiptAnalysisResult = {
    ...primaryDoc,
    invoiceNumber: [...new Set(results.map(r => r.invoiceNumber).filter(Boolean))].join(", ") || null,
    items: [...new Set(results.flatMap(r => r.items))],
    description: [...new Set(results.map(r => r.description).filter(Boolean))].join(" | ") || null,
    warnings,
  };

  if (whtCerts.length > 0 && !result.wht.rate) {
    const whtDoc = whtCerts[0];
    result.wht = {
      rate: whtDoc.wht.rate,
      amount: whtDoc.wht.amount,
      type: whtDoc.wht.type,
    };
  }

  if (!result.amount && slips.length > 0 && slips[0].amount) {
    result.amount = slips[0].amount;
    result.netAmount = slips[0].netAmount;
  }

  const bestAccountDoc = results.reduce((best, current) => {
    if (!current.account.id) return best;
    if (!best) return current;
    return (current.account.confidence || 0) > (best.account.confidence || 0) ? current : best;
  }, null as ReceiptAnalysisResult | null);

  if (bestAccountDoc && bestAccountDoc.account.id) {
    result.account = bestAccountDoc.account;
    result.accountAlternatives = bestAccountDoc.accountAlternatives;
  }

  result.confidence = {
    overall: Math.round(results.reduce((sum, r) => sum + r.confidence.overall, 0) / results.length),
    vendor: Math.round(results.reduce((sum, r) => sum + r.confidence.vendor, 0) / results.length),
    amount: Math.round(results.reduce((sum, r) => sum + r.confidence.amount, 0) / results.length),
    date: Math.round(results.reduce((sum, r) => sum + r.confidence.date, 0) / results.length),
    account: Math.round(results.reduce((sum, r) => sum + r.confidence.account, 0) / results.length),
  };

  return result;
}
