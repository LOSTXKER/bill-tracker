import { apiResponse } from "@/lib/api/response";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { createApiLogger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/error-helpers";
import { analyzeReceipt } from "@/lib/ai/analyze-receipt";
import { withAuth } from "@/lib/api/with-auth";
import { rateLimit, getClientIP } from "@/lib/security/rate-limit";

const log = createApiLogger("ai/analyze-public");

const ALLOWED_IMAGE_HOSTS = [
  ".supabase.co",
  ".supabase.in",
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_IMAGE_HOSTS.some((host) => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}

/**
 * POST /api/ai/analyze-public
 * AI receipt analysis — requires authentication
 */
export async function POST(request: Request) {
  return withAuth(async (req, { session }) => {
    try {
      const ip = getClientIP(req);
      const rl = rateLimit(`ai-analyze:${ip}`, { maxRequests: 15, windowMs: 60_000 });
      if (!rl.success) {
        return apiResponse.error("Rate limit exceeded. Please try again later.");
      }

      if (!isGeminiConfigured()) {
        return apiResponse.error(
          "AI features not configured. Please set GOOGLE_GEMINI_API_KEY."
        );
      }

      const body = await req.json();
      const { imageUrls, companyId } = body;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return apiResponse.badRequest("imageUrls array is required");
      }

      if (imageUrls.length > 10) {
        return apiResponse.badRequest("Maximum 10 images allowed");
      }

      for (const url of imageUrls) {
        if (typeof url !== "string" || !isAllowedImageUrl(url)) {
          return apiResponse.badRequest(
            "All imageUrls must be valid HTTPS URLs from allowed storage hosts"
          );
        }
      }

      if (!companyId) {
        return apiResponse.badRequest("companyId is required");
      }

      const access = await prisma.companyAccess.findFirst({
        where: { userId: session.user.id, companyId },
        select: { companyId: true },
      });

      if (!access) {
        return apiResponse.forbidden("ไม่มีสิทธิ์เข้าถึงบริษัทนี้");
      }

      const aiResult = await analyzeReceipt({
        imageUrls,
        companyId,
        transactionType: "EXPENSE",
      });

      if ("error" in aiResult) {
        return apiResponse.error(aiResult.error);
      }

      const totalAmount =
        (aiResult.amount || 0) + (aiResult.vatAmount || 0) - (aiResult.wht.amount || 0);

      const response = {
        combined: {
          vendorName: aiResult.vendor.name,
          vendorTaxId: aiResult.vendor.taxId,
          totalAmount: aiResult.netAmount || totalAmount,
          amount: aiResult.amount,
          vatAmount: aiResult.vatAmount,
          vatRate: aiResult.vatRate,
          whtAmount: aiResult.wht.amount,
          whtRate: aiResult.wht.rate,
          netAmount: aiResult.netAmount,
          date: aiResult.date,
          description: aiResult.description,
          items: aiResult.items,
          documentType: aiResult.documentType,
          invoiceNumber: aiResult.invoiceNumber,
        },
        confidence: aiResult.confidence,
      };

      return apiResponse.success(response);
    } catch (error) {
      log.error("Analyze error", error);
      return apiResponse.error(getErrorMessage(error, "Failed to analyze receipt"));
    }
  })(request);
}
