import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeAndClassifyMultiple } from "@/lib/ai/smart-ocr";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";

/**
 * POST /api/ai/analyze-documents
 * Analyze multiple document images, classify them, and extract combined data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Gemini API is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error: "AI features not configured. Please set GOOGLE_GEMINI_API_KEY.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      imageUrls,
      companyCode,
      transactionType = "EXPENSE",
    } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "imageUrls array is required" },
        { status: 400 }
      );
    }

    if (!companyCode) {
      return NextResponse.json(
        { error: "companyCode is required" },
        { status: 400 }
      );
    }

    // Find company
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
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

    return NextResponse.json({
      success: true,
      ...result,
      meta: {
        processingTime,
        userId: session.user.id,
        companyId: company.id,
        fileCount: imageUrls.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Multi-document analysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/analyze-documents
 * Check if multi-document analysis is available
 */
export async function GET() {
  const isConfigured = isGeminiConfigured();

  return NextResponse.json({
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
