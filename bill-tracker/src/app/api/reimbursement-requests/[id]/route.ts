import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reimbursement-requests/[id]
 * Get single reimbursement request by ID
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const reimbursementRequest = await prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        approver: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true },
        },
        contact: {
          select: { id: true, name: true },
        },
        linkedExpense: {
          select: { id: true, status: true },
        },
      },
    });

    if (!reimbursementRequest) {
      return apiResponse.notFound("Reimbursement request not found");
    }

    return apiResponse.success({ request: reimbursementRequest });
  } catch (error) {
    console.error("Error fetching reimbursement request:", error);
    return apiResponse.error("Failed to fetch reimbursement request");
  }
}
