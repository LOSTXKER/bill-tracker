import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/reimbursement-requests/check-duplicate
 * 
 * Check for duplicate reimbursement requests
 * (same name + amount + date within 24 hours)
 * 
 * Public API - no auth required
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const requesterName = searchParams.get("requesterName");
    const amount = searchParams.get("amount");
    const billDate = searchParams.get("billDate");

    if (!companyId || !requesterName || !amount || !billDate) {
      return apiResponse.badRequest("Missing required parameters");
    }

    // Check for similar requests in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const duplicates = await prisma.reimbursementRequest.findMany({
      where: {
        companyId,
        requesterName: {
          equals: requesterName,
          mode: "insensitive",
        },
        amount: {
          equals: Number(amount),
        },
        billDate: new Date(billDate),
        createdAt: {
          gte: oneDayAgo,
        },
      },
      take: 1,
    });

    return apiResponse.success({
      isDuplicate: duplicates.length > 0,
      count: duplicates.length,
    });
  } catch (error) {
    console.error("Error checking duplicate:", error);
    return apiResponse.error("Failed to check duplicate");
  }
}
