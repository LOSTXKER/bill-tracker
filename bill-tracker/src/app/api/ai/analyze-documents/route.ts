import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { analyzeReceipt, ReceiptAnalysisResult } from "@/lib/ai/analyze-receipt";
import { findVendorMemory } from "@/lib/ai/vendor-memory";

/**
 * POST /api/ai/analyze-documents
 * 🧠 ระบบใหม่: AI วิเคราะห์ทุกอย่างในครั้งเดียว
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

    // Find company
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      return apiResponse.notFound("Company not found");
    }

    const startTime = Date.now();

    // 🧠 ระบบใหม่: AI วิเคราะห์ครั้งเดียว
    const aiResult = await analyzeReceipt({
      imageUrls,
      companyId: company.id,
      transactionType: transactionType.toUpperCase() as "EXPENSE" | "INCOME",
    });

    if ("error" in aiResult) {
      return apiResponse.error(aiResult.error);
    }

    // เช็ค Vendor Memory
    let vendorMemory = null;
    let finalResult = aiResult;

    if (aiResult.vendor.taxId || aiResult.vendor.name) {
      vendorMemory = await findVendorMemory(
        company.id,
        aiResult.vendor.name,
        aiResult.vendor.taxId,
        transactionType.toUpperCase() as "EXPENSE" | "INCOME"
      );

      if (vendorMemory) {
        finalResult = applyVendorMemory(aiResult, vendorMemory);
      }
    }

    const processingTime = Date.now() - startTime;

    // Log analysis
    console.log("🧠 AI Analysis (New System):", {
      userId: session.user.id,
      companyId: company.id,
      processingTime,
      fileCount: imageUrls.length,
      transactionType,
      vendor: finalResult.vendor.name,
      account: finalResult.account.name,
      confidence: finalResult.confidence.overall,
      fromMemory: !!vendorMemory,
    });

    // Convert to legacy format for compatibility
    const legacyResult = convertToLegacyFormat(finalResult, imageUrls, vendorMemory);

    return apiResponse.success({
      ...legacyResult,
      meta: {
        processingTime,
        userId: session.user.id,
        companyId: company.id,
        fileCount: imageUrls.length,
        timestamp: new Date().toISOString(),
        newSystem: true,  // Flag ว่าใช้ระบบใหม่
      },
    });
  })(request);
}

/**
 * Apply vendor memory to override AI result
 */
function applyVendorMemory(
  aiResult: ReceiptAnalysisResult,
  memory: any
): ReceiptAnalysisResult {
  return {
    ...aiResult,
    vendor: {
      ...aiResult.vendor,
      matchedContactId: memory.contactId || aiResult.vendor.matchedContactId,
      matchedContactName: memory.contactName || aiResult.vendor.matchedContactName,
    },
    account: memory.accountId ? {
      id: memory.accountId,
      code: memory.accountCode,
      name: memory.accountName,
    } : aiResult.account,
    vatRate: memory.defaultVatRate ?? aiResult.vatRate,
    wht: memory.defaultWhtRate ? {
      rate: memory.defaultWhtRate,
      amount: aiResult.amount ? (aiResult.amount * memory.defaultWhtRate / 100) : null,
      type: memory.defaultWhtType || aiResult.wht.type,
    } : aiResult.wht,
    confidence: {
      ...aiResult.confidence,
      overall: memory.accountId ? 100 : aiResult.confidence.overall,
      account: memory.accountId ? 100 : aiResult.confidence.account,
      vendor: memory.contactId ? 100 : aiResult.confidence.vendor,
    },
  };
}

/**
 * Convert new format to legacy format for frontend compatibility
 */
function convertToLegacyFormat(result: ReceiptAnalysisResult, imageUrls: string[], vendorMemory: any) {
  return {
    // Combined data (for form auto-fill)
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
    },
    // Suggested values (account, contact)
    suggested: {
      accountId: result.account.id,
      accountCode: result.account.code,
      accountName: result.account.name,
      contactId: result.vendor.matchedContactId,
      contactName: result.vendor.matchedContactName,
      vatRate: result.vatRate,
      whtRate: result.wht.rate,
      whtType: result.wht.type,
    },
    // Confidence scores
    confidence: result.confidence,
    // File assignments (all to invoice for now)
    fileAssignments: imageUrls.reduce((acc, url) => {
      acc[url] = result.documentType === "BANK_SLIP" ? "slip" 
               : result.documentType === "WHT_CERT" ? "whtCert" 
               : "invoice";
      return acc;
    }, {} as Record<string, string>),
    // Smart matching info
    smart: {
      mapping: vendorMemory ? {
        id: vendorMemory.id,
        vendorName: vendorMemory.vendorName,
        accountId: vendorMemory.accountId,
        accountName: vendorMemory.accountName,
      } : null,
      matchConfidence: vendorMemory ? 100 : result.confidence.vendor,
      isNewVendor: !vendorMemory && !result.vendor.matchedContactId,
      suggested: {
        accountId: result.account.id,
        contactId: result.vendor.matchedContactId,
        vatRate: result.vatRate,
        whtRate: result.wht.rate,
      },
    },
    // AI account suggestion
    aiAccountSuggestion: result.account.id ? {
      accountId: result.account.id,
      accountCode: result.account.code,
      accountName: result.account.name,
      confidence: result.confidence.account,
      reason: result.description || "AI วิเคราะห์จากเอกสาร",
    } : null,
    // Detected transaction type
    detectedTransactionType: null,
  };
}

/**
 * GET /api/ai/analyze-documents
 * Check if multi-document analysis is available
 */
export async function GET() {
  const isConfigured = isGeminiConfigured();

  return apiResponse.success({
    available: isConfigured,
    message: isConfigured
      ? "Multi-document analysis is available"
      : "AI features not configured",
    features: {
      multiDocAnalysis: isConfigured,
      documentClassification: isConfigured,
      smartMatching: isConfigured,
      transactionTypeDetection: isConfigured,
    },
  });
}
