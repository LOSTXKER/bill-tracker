import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { analyzeReceipt, validateReceiptData, ReceiptData } from "@/lib/ai/receipt-ocr";
import { analyzeAndMatch } from "@/lib/ai/smart-ocr";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

/**
 * POST /api/ai/analyze-receipt
 * Analyze receipt image using AI OCR - SIMPLIFIED
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
      imageUrl, 
      imageData, 
      mimeType = "image/jpeg",
      companyCode,
      smartMatch = true,
    } = body;

    if (!imageUrl && !imageData) {
      return apiResponse.badRequest("Either imageUrl or imageData is required");
    }

    let imageBuffer: Buffer | string;

    // Handle image URL (from storage)
    if (imageUrl) {
      try {
        if (imageUrl.startsWith("/uploads/")) {
          const publicDir = path.join(process.cwd(), "public");
          const filePath = path.join(publicDir, imageUrl);

          if (!fs.existsSync(filePath)) {
            return apiResponse.notFound("Image file not found");
          }

          imageBuffer = fs.readFileSync(filePath);
        } else {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            return apiResponse.badRequest("Failed to fetch image from URL");
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
      } catch (error) {
        console.error("Failed to load image:", error);
        return apiResponse.badRequest("Failed to load image");
      }
    } else {
      imageBuffer = imageData;
    }

    const startTime = Date.now();

    // Smart matching if company code is provided
    if (smartMatch && companyCode) {
      const company = await prisma.company.findUnique({
        where: { code: companyCode.toUpperCase() },
      });

      if (company) {
        const smartResult = await analyzeAndMatch(imageBuffer, company.id, mimeType);
        const processingTime = Date.now() - startTime;

        if ("error" in smartResult) {
          return apiResponse.error(smartResult.error);
        }

        const validation = validateReceiptData(smartResult.ocr);

        console.log("Smart OCR Analysis:", {
          userId: session.user.id,
          companyId: company.id,
          processingTime,
          confidence: smartResult.ocr.confidence.overall,
          isNewVendor: smartResult.isNewVendor,
        });

        return apiResponse.success({
          data: smartResult.ocr,
          smart: {
            suggested: smartResult.suggested,
            foundContact: smartResult.foundContact,
            aiAccountSuggestion: smartResult.aiAccountSuggestion,
            isNewVendor: smartResult.isNewVendor,
          },
          validation: {
            isValid: validation.isValid,
            missingFields: validation.missingFields,
            warnings: validation.warnings,
          },
          meta: {
            processingTime,
            userId: session.user.id,
            companyId: company.id,
            smartMatchEnabled: true,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Fallback to basic OCR
    const result = await analyzeReceipt(imageBuffer, mimeType);
    const processingTime = Date.now() - startTime;

    if ("error" in result) {
      return apiResponse.error(result.error);
    }

    const receiptData = result as ReceiptData;
    const validation = validateReceiptData(receiptData);

    console.log("Receipt OCR Analysis:", {
      userId: session.user.id,
      processingTime,
      confidence: receiptData.confidence.overall,
      isValid: validation.isValid,
    });

    return apiResponse.success({
      data: receiptData,
      smart: null,
      validation: {
        isValid: validation.isValid,
        missingFields: validation.missingFields,
        warnings: validation.warnings,
      },
      meta: {
        processingTime,
        userId: session.user.id,
        smartMatchEnabled: false,
        timestamp: new Date().toISOString(),
      },
    });
  })(request);
}

/**
 * GET /api/ai/analyze-receipt
 * Check if AI OCR is available
 */
export async function GET() {
  const isConfigured = isGeminiConfigured();

  return apiResponse.success({
    available: isConfigured,
    message: isConfigured
      ? "AI receipt analysis is available"
      : "AI features not configured",
  });
}
