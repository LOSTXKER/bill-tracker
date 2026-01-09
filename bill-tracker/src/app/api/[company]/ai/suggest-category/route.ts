/**
 * API Route: AI Category Suggestion
 * Suggests the best category for a transaction based on vendor name and description
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";
import { getCompanyFromPath } from "@/lib/api/company";
import { suggestCategoryFromContent } from "@/lib/ai/smart-ocr";

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
    const { transactionType, vendorName, description, items } = body;

    if (!transactionType || !["EXPENSE", "INCOME"].includes(transactionType)) {
      return apiResponse.badRequest("ประเภทธุรกรรมไม่ถูกต้อง");
    }

    if (!vendorName && !description) {
      return apiResponse.badRequest("กรุณาระบุชื่อผู้ติดต่อหรือรายละเอียด");
    }

    // Call AI to suggest category
    const suggestion = await suggestCategoryFromContent(
      companyResult.company.id,
      transactionType as "EXPENSE" | "INCOME",
      {
        vendorName,
        description,
        items: items || [],
      }
    );

    return apiResponse.success(suggestion);
  } catch (error) {
    console.error("AI suggest category error:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการแนะนำหมวดหมู่");
  }
}
