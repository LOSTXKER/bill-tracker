/**
 * API Route: AI Category Suggestion
 * Suggests the best category for a transaction based on vendor name, description, and images
 * 
 * Priority:
 * 1. Check VendorMapping (user-taught data) first
 * 2. Fall back to AI suggestion if no mapping found
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api/response";
import { getCompanyFromPath } from "@/lib/api/company";
import { suggestCategoryFromContent, findCategoryFromMapping } from "@/lib/ai/smart-ocr";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ company: string }> }
) {
  try {
    const { company: companyCode } = await context.params;
    const companyResult = await getCompanyFromPath(companyCode);

    if (!companyResult.success || !companyResult.company) {
      return apiResponse.unauthorized("ไม่พบบริษัท");
    }

    const body = await request.json();
    const { transactionType, vendorName, description, items, imageUrls } = body;

    if (!transactionType || !["EXPENSE", "INCOME"].includes(transactionType)) {
      return apiResponse.badRequest("ประเภทธุรกรรมไม่ถูกต้อง");
    }

    // Allow image-only analysis (no vendor/description required if we have images)
    const hasImages = imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0;
    if (!vendorName && !description && !hasImages) {
      return apiResponse.badRequest("กรุณาระบุชื่อผู้ติดต่อ รายละเอียด หรือแนบไฟล์");
    }

    // Step 1: Check VendorMapping first (user-taught data has priority)
    if (vendorName) {
      const mappingResult = await findCategoryFromMapping(
        companyResult.company.id,
        vendorName,
        transactionType as "EXPENSE" | "INCOME"
      );

      if (mappingResult) {
        console.log(`[AI suggest-category] Found from VendorMapping: ${mappingResult.categoryName}`);
        return apiResponse.success(mappingResult);
      }
    }

    // Step 2: Fall back to AI suggestion
    const suggestion = await suggestCategoryFromContent(
      companyResult.company.id,
      transactionType as "EXPENSE" | "INCOME",
      {
        vendorName,
        description,
        items: items || [],
        imageUrls: hasImages ? imageUrls : undefined,
      }
    );

    return apiResponse.success(suggestion);
  } catch (error) {
    console.error("AI suggest category error:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการแนะนำหมวดหมู่");
  }
}
