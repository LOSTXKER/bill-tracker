import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeReceipt, validateReceiptData, ReceiptData } from "@/lib/ai/receipt-ocr";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import fs from "fs";
import path from "path";

/**
 * POST /api/ai/analyze-receipt
 * Analyze receipt image using AI OCR
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
    const { imageUrl, imageData, mimeType = "image/jpeg" } = body;

    if (!imageUrl && !imageData) {
      return NextResponse.json(
        { error: "Either imageUrl or imageData is required" },
        { status: 400 }
      );
    }

    let imageBuffer: Buffer | string;

    // Handle image URL (from storage)
    if (imageUrl) {
      try {
        // If it's a local file path (starts with /uploads/)
        if (imageUrl.startsWith("/uploads/")) {
          const publicDir = path.join(process.cwd(), "public");
          const filePath = path.join(publicDir, imageUrl);

          if (!fs.existsSync(filePath)) {
            return NextResponse.json(
              { error: "Image file not found" },
              { status: 404 }
            );
          }

          imageBuffer = fs.readFileSync(filePath);
        } else {
          // External URL - fetch it
          const response = await fetch(imageUrl);
          if (!response.ok) {
            return NextResponse.json(
              { error: "Failed to fetch image from URL" },
              { status: 400 }
            );
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
      } catch (error) {
        console.error("Failed to load image:", error);
        return NextResponse.json(
          { error: "Failed to load image" },
          { status: 400 }
        );
      }
    } else {
      // Handle base64 image data
      imageBuffer = imageData;
    }

    // Analyze the receipt
    const startTime = Date.now();
    const result = await analyzeReceipt(imageBuffer, mimeType);
    const processingTime = Date.now() - startTime;

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const receiptData = result as ReceiptData;

    // Validate the extracted data
    const validation = validateReceiptData(receiptData);

    // Log analysis for improvement (optional - could store in database)
    console.log("Receipt OCR Analysis:", {
      userId: session.user.id,
      processingTime,
      confidence: receiptData.confidence.overall,
      isValid: validation.isValid,
      missingFields: validation.missingFields,
    });

    // Return the analyzed data
    return NextResponse.json({
      success: true,
      data: receiptData,
      validation: {
        isValid: validation.isValid,
        missingFields: validation.missingFields,
        warnings: validation.warnings,
      },
      meta: {
        processingTime,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Receipt analysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/analyze-receipt
 * Check if AI OCR is available
 */
export async function GET() {
  const isConfigured = isGeminiConfigured();

  return NextResponse.json({
    available: isConfigured,
    message: isConfigured
      ? "AI receipt analysis is available"
      : "AI features not configured",
  });
}
