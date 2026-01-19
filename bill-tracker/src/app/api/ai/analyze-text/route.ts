/**
 * AI Text Analysis API
 * วิเคราะห์ข้อความเพื่อดึงข้อมูลรายการทางการเงิน
 * 
 * POST /api/ai/analyze-text
 * Body: { text: string, companyCode: string, type: "expense" | "income" }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { analyzeText } from "@/lib/ai/analyze-text";
import { apiResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    // Parse request body
    const body = await request.json();
    const { text, companyCode, type } = body;

    if (!text || typeof text !== "string") {
      return apiResponse.badRequest("กรุณาใส่ข้อความ");
    }

    if (!companyCode) {
      return apiResponse.badRequest("กรุณาระบุบริษัท");
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: { id: true },
    });

    if (!company) {
      return apiResponse.notFound("Company");
    }

    // Check company access
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: company.id,
        },
      },
    });

    if (!access) {
      return apiResponse.forbidden("You don't have access to this company");
    }

    // Analyze text
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

  } catch (error) {
    console.error("[AI Text Analysis] Error:", error);
    return apiResponse.error(
      error instanceof Error ? error : new Error("Internal server error")
    );
  }
}
