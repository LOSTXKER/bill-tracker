import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { analyzeReceipt, ReceiptAnalysisResult } from "@/lib/ai/analyze-receipt";
import { convertCurrency, CurrencyDetectionResult } from "@/lib/ai/currency-converter";
import { createApiLogger } from "@/lib/utils/logger";

const log = createApiLogger("ai/analyze-documents");

/**
 * POST /api/ai/analyze-documents
 * 🧠 AI วิเคราะห์เอกสาร - ส่ง context ให้ AI ตัดสินใจเอง
 */
export async function POST(request: Request) {
  return withAuth(async (req, { session }) => {
    // Check if Gemini API is configured
    if (!isGeminiConfigured()) {
      return apiResponse.error(
        "AI features not configured. Please set GOOGLE_GEMINI_API_KEY."
      );
    }

    const body = await req.json();
    const {
      imageUrls,
      companyCode,
      transactionType = "EXPENSE",
    } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return apiResponse.badRequest("imageUrls array is required");
    }

    if (!companyCode) {
      return apiResponse.badRequest("companyCode is required");
    }

    // Find company with exchange rates
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: { id: true, name: true, exchangeRates: true },
    });

    if (!company) {
      return apiResponse.notFound("Company not found");
    }

    // Get exchange rates from company settings
    const exchangeRates = (company.exchangeRates as Record<string, number>) || {};

    const startTime = Date.now();

    // 🧠 AI วิเคราะห์ - AI ฉลาดอยู่แล้ว ให้มันจัดการเอง
    const aiResult = await analyzeReceipt({
      imageUrls,
      companyId: company.id,
      transactionType: transactionType.toUpperCase() as "EXPENSE" | "INCOME",
    });

    if ("error" in aiResult) {
      return apiResponse.error(aiResult.error);
    }

    const processingTime = Date.now() - startTime;

    // Apply currency conversion if detected foreign currency
    let currencyConversion: CurrencyDetectionResult | null = null;
    if (aiResult.currency && aiResult.currency !== "THB" && aiResult.amount) {
      currencyConversion = convertCurrency(
        aiResult.amount,
        aiResult.currency as "USD" | "AED" | "THB",
        exchangeRates
      );
      log.info("Currency conversion applied", {
        originalCurrency: aiResult.currency,
        originalAmount: aiResult.amount,
        convertedAmount: currencyConversion.convertedAmount,
        exchangeRate: currencyConversion.exchangeRate,
      });
    }

    log.info("AI analysis completed", {
      userId: session.user.id,
      companyId: company.id,
      processingTime,
      vendor: aiResult.vendor.name,
      matchedContact: aiResult.vendor.matchedContactName,
      account: aiResult.account.name,
      confidence: aiResult.confidence.overall,
      isNewVendor: !aiResult.vendor.matchedContactId,
    });

    // Convert to legacy format for frontend
    const result = convertToLegacyFormat(aiResult, imageUrls, currencyConversion);

    return apiResponse.success({
      ...result,
      meta: {
        processingTime,
        userId: session.user.id,
        companyId: company.id,
        fileCount: imageUrls.length,
        timestamp: new Date().toISOString(),
      },
    });
  })(request);
}

/**
 * Convert to legacy format for frontend compatibility
 */
function convertToLegacyFormat(
  result: ReceiptAnalysisResult, 
  imageUrls: string[],
  currencyConversion: CurrencyDetectionResult | null
) {
  return {
    combined: {
      vendorName: result.vendor.name,
      vendorTaxId: result.vendor.taxId,
      vendorAddress: result.vendor.address,
      vendorPhone: result.vendor.phone,
      vendorBranchNumber: result.vendor.branchNumber,
      date: result.date,
      amount: result.amount,
      vatAmount: result.vatAmount,
      vatRate: result.vatRate,
      whtRate: result.wht.rate,
      whtAmount: result.wht.amount,
      whtType: result.wht.type,
      netAmount: result.netAmount,
      documentType: result.documentType,
      invoiceNumber: result.invoiceNumber,
      items: result.items,
      description: result.description,
      currency: result.currency,
    },
    suggested: {
      accountId: result.account.id,
      accountCode: result.account.code,
      accountName: result.account.name,
      contactId: result.vendor.matchedContactId,
      contactName: result.vendor.matchedContactName,
      vatRate: result.vatRate,
      whtRate: result.wht.rate,
      whtAmount: result.wht.amount,
      whtType: result.wht.type,
    },
    confidence: result.confidence,
    fileAssignments: imageUrls.reduce((acc, url) => {
      const docType = result.documentType;
      // Map document types to categories
      if (docType === "BANK_SLIP") {
        acc[url] = "slip";
      } else if (docType === "WHT_CERT") {
        acc[url] = "whtCert";
      } else if (docType === "TAX_INVOICE" || docType === "RECEIPT") {
        acc[url] = "invoice";
      } else if (["QUOTATION", "INVOICE", "CONTRACT", "PURCHASE_ORDER", "DELIVERY_NOTE", "OTHER"].includes(docType || "")) {
        // These go to "other" category with subtype
        acc[url] = `other:${docType}`;
      } else {
        acc[url] = "invoice"; // Default fallback
      }
      return acc;
    }, {} as Record<string, string>),
    smart: {
      mapping: null,
      matchConfidence: result.confidence.vendor,
      isNewVendor: !result.vendor.matchedContactId,
      suggested: {
        accountId: result.account.id,
        contactId: result.vendor.matchedContactId,
        vatRate: result.vatRate,
        whtRate: result.wht.rate,
      },
      foundContact: result.vendor.matchedContactId ? {
        id: result.vendor.matchedContactId,
        name: result.vendor.matchedContactName,
      } : null,
    },
    aiAccountSuggestion: result.account.id ? {
      accountId: result.account.id,
      accountCode: result.account.code,
      accountName: result.account.name,
      confidence: result.account.confidence || result.confidence.account,
      reason: result.account.reason || result.description || "AI วิเคราะห์จากเอกสาร",
      // Transform alternatives to match frontend format (accountId/accountCode/accountName)
      alternatives: (result.accountAlternatives || []).map(alt => ({
        accountId: alt.id,
        accountCode: alt.code,
        accountName: alt.name,
        confidence: alt.confidence,
        reason: alt.reason,
      })),
    } : null,
    detectedTransactionType: null,
    // Currency conversion info
    currencyConversion: currencyConversion ? {
      detected: currencyConversion.detected,
      currency: currencyConversion.currency,
      originalAmount: currencyConversion.originalAmount,
      convertedAmount: currencyConversion.convertedAmount,
      exchangeRate: currencyConversion.exchangeRate,
      conversionNote: currencyConversion.conversionNote,
    } : null,
    // คำเตือนจากการวิเคราะห์
    warnings: result.warnings || [],
  };
}

/**
 * GET /api/ai/analyze-documents
 */
export async function GET() {
  const isConfigured = isGeminiConfigured();

  return apiResponse.success({
    available: isConfigured,
    message: isConfigured
      ? "AI document analysis is available"
      : "AI features not configured",
  });
}
