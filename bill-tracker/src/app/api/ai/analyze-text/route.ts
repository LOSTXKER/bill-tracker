/**
 * AI Text Analysis API
 * วิเคราะห์ข้อความเพื่อดึงข้อมูลรายการทางการเงิน
 * 
 * POST /api/ai/analyze-text
 * Body: { text: string, companyCode: string, type: "expense" | "income" }
 */

import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { analyzeText } from "@/lib/ai/analyze-text";

export const POST = withCompanyAccess(async (request, { company }) => {
  const body = await request.json();
  const { text, type } = body;

  if (!text || typeof text !== "string") {
    return apiResponse.badRequest("กรุณาใส่ข้อความ");
  }

  const transactionType = type === "income" ? "INCOME" : "EXPENSE";
  const result = await analyzeText({
    text: text.trim(),
    companyId: company.id,
    transactionType,
  });

  if ("error" in result) {
    return apiResponse.error(new Error(result.error));
  }

  return apiResponse.success(result);
});
