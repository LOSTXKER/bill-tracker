import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { analyzeAndClassifyMultiple } from "@/lib/ai/smart-ocr";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";

/**
 * POST /api/ai/analyze-documents
 * Analyze multiple document images, classify them, and extract combined data
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
    });

    if (!company) {
      return apiResponse.notFound("Company not found");
    }

    const startTime = Date.now();

    // Analyze all documents
    const result = await analyzeAndClassifyMultiple(
      imageUrls,
      company.id,
      transactionType.toUpperCase() as "EXPENSE" | "INCOME",
      company.name
    );

    const processingTime = Date.now() - startTime;

    if ("error" in result) {
      return apiResponse.error(result.error);
    }

    // Log analysis
    console.log("Multi-Document Analysis:", {
      userId: session.user.id,
      companyId: company.id,
      processingTime,
      fileCount: imageUrls.length,
      transactionType,
      detectedType: result.detectedTransactionType,
      matchConfidence: result.smart?.matchConfidence,
      isNewVendor: result.smart?.isNewVendor,
    });

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
