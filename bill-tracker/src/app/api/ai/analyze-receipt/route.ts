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
 * Analyze receipt image using AI OCR with smart vendor matching
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
      companyCode, // Optional: for smart matching
      smartMatch = true, // Enable smart matching by default
    } = body;

    if (!imageUrl && !imageData) {
      return apiResponse.badRequest("Either imageUrl or imageData is required");
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
            return apiResponse.notFound("Image file not found");
          }

          imageBuffer = fs.readFileSync(filePath);
        } else {
          // External URL - fetch it
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
      // Handle base64 image data
      imageBuffer = imageData;
    }

    const startTime = Date.now();

    // Check if smart matching is enabled and company code is provided
    if (smartMatch && companyCode) {
      // Find company
      const company = await prisma.company.findUnique({
        where: { code: companyCode.toUpperCase() },
      });

      if (company) {
        // Use smart OCR with vendor matching
        const smartResult = await analyzeAndMatch(imageBuffer, company.id, mimeType);
        const processingTime = Date.now() - startTime;

        if ("error" in smartResult) {
          return apiResponse.error(smartResult.error);
        }

        // Validate the OCR data
        const validation = validateReceiptData(smartResult.ocr);

        // Log analysis
        console.log("Smart OCR Analysis:", {
          userId: session.user.id,
          companyId: company.id,
          processingTime,
          confidence: smartResult.ocr.confidence.overall,
          matchConfidence: smartResult.matchConfidence,
          matchReason: smartResult.matchReason,
          isNewVendor: smartResult.isNewVendor,
        });

        return apiResponse.success({
          data: smartResult.ocr,
          smart: {
            mapping: smartResult.mapping ? {
              id: smartResult.mapping.id,
              vendorName: smartResult.mapping.vendorName,
              contactId: smartResult.mapping.contactId,
              contactName: smartResult.mapping.contact?.name,
              categoryId: smartResult.mapping.categoryId,
              categoryName: smartResult.mapping.category?.name,
              defaultVatRate: smartResult.mapping.defaultVatRate,
              paymentMethod: smartResult.mapping.paymentMethod,
              descriptionTemplate: smartResult.mapping.descriptionTemplate,
            } : null,
            matchConfidence: smartResult.matchConfidence,
            matchReason: smartResult.matchReason,
            suggested: smartResult.suggested,
            isNewVendor: smartResult.isNewVendor,
            suggestTraining: smartResult.suggestTraining,
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

    // Fallback to basic OCR (no smart matching)
    const result = await analyzeReceipt(imageBuffer, mimeType);
    const processingTime = Date.now() - startTime;

    if ("error" in result) {
      return apiResponse.error(result.error);
    }

    const receiptData = result as ReceiptData;

    // Validate the extracted data
    const validation = validateReceiptData(receiptData);

    // Log analysis
    console.log("Receipt OCR Analysis:", {
      userId: session.user.id,
      processingTime,
      confidence: receiptData.confidence.overall,
      isValid: validation.isValid,
      missingFields: validation.missingFields,
    });

    // Return the analyzed data
    return apiResponse.success({
      data: receiptData,
      smart: null, // No smart matching
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
    features: {
      basicOcr: isConfigured,
      smartMatching: isConfigured,
      vendorTraining: isConfigured,
    },
  });
}
