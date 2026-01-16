import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { deleteFile } from "@/lib/storage/upload";

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

    const reimbursementRequestRaw = await prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        User_ReimbursementRequest_approvedByToUser: {
          select: { id: true, name: true },
        },
        User_ReimbursementRequest_paidByToUser: {
          select: { id: true, name: true },
        },
        Contact: {
          select: { id: true, name: true },
        },
        Expense: {
          select: { id: true, status: true },
        },
      },
    });

    if (!reimbursementRequestRaw) {
      return apiResponse.notFound("Reimbursement request not found");
    }

    // Map Prisma relation names to client-expected names
    const reimbursementRequest = {
      ...reimbursementRequestRaw,
      approver: reimbursementRequestRaw.User_ReimbursementRequest_approvedByToUser,
      payer: reimbursementRequestRaw.User_ReimbursementRequest_paidByToUser,
      contact: reimbursementRequestRaw.Contact,
      linkedExpense: reimbursementRequestRaw.Expense,
    };

    return apiResponse.success({ request: reimbursementRequest });
  } catch (error) {
    console.error("Error fetching reimbursement request:", error);
    return apiResponse.error("Failed to fetch reimbursement request");
  }
}

/**
 * DELETE /api/reimbursement-requests/[id]
 * Delete a reimbursement request
 * Only allowed for PENDING, FLAGGED, or REJECTED status
 */
export const DELETE = withAuth<RouteParams>(async (request, { session }, routeContext) => {
  try {
    const { id } = await routeContext!.params;

    // Find the request first
    const reimbursementRequest = await prisma.reimbursementRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        receiptUrls: true,
        linkedExpenseId: true,
        companyId: true,
      },
    });

    if (!reimbursementRequest) {
      return apiResponse.notFound("ไม่พบรายการเบิกจ่าย");
    }

    // Check if can delete (only PENDING, FLAGGED, or REJECTED)
    const allowedStatuses = ["PENDING", "FLAGGED", "REJECTED"];
    if (!allowedStatuses.includes(reimbursementRequest.status)) {
      return apiResponse.forbidden(
        `ไม่สามารถลบรายการที่มีสถานะ "${reimbursementRequest.status}" ได้ (อนุญาตเฉพาะรอดำเนินการ, ต้องตรวจสอบ, หรือถูกปฏิเสธ)`
      );
    }

    // Delete associated files from storage
    const receiptUrls = reimbursementRequest.receiptUrls as string[] | null;
    if (receiptUrls && receiptUrls.length > 0) {
      await Promise.allSettled(
        receiptUrls.map((url: string) => deleteFile(url))
      );
    }

    // Delete the request
    await prisma.reimbursementRequest.delete({
      where: { id },
    });

    return apiResponse.success({ 
      message: "ลบรายการเบิกจ่ายสำเร็จ",
      deletedId: id,
    });
  } catch (error) {
    console.error("Error deleting reimbursement request:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการลบรายการ");
  }
});
