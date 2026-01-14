import { apiResponse } from "@/lib/api/response";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { analyzeReceipt } from "@/lib/ai/analyze-receipt";

/**
 * POST /api/ai/analyze-public
 * 🌐 Public API: AI วิเคราะห์ใบเสร็จสำหรับหน้าเบิกจ่าย (ไม่ต้อง login)
 */
export async function POST(request: Request) {
  try {
    // Check if Gemini API is configured
    if (!isGeminiConfigured()) {
      return apiResponse.error(
        "AI features not configured. Please set GOOGLE_GEMINI_API_KEY."
      );
    }

    const body = await request.json();
    const { imageUrls, companyId } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return apiResponse.badRequest("imageUrls array is required");
    }

    if (!companyId) {
      return apiResponse.badRequest("companyId is required");
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return apiResponse.notFound("Company not found");
    }

    // 🧠 AI วิเคราะห์ใบเสร็จ
    const aiResult = await analyzeReceipt({
      imageUrls,
      companyId: company.id,
      transactionType: "EXPENSE",
    });

    if ("error" in aiResult) {
      return apiResponse.error(aiResult.error);
    }

    // Convert to frontend format
    // totalAmount = amount + vatAmount (for display)
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
    console.error("[analyze-public] Error:", error);
    return apiResponse.error(
      error instanceof Error ? error.message : "Failed to analyze receipt"
    );
  }
}
