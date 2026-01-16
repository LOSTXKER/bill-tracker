import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/track/[code]
 * 
 * ตรวจสอบสถานะคำขอเบิกจ่ายด้วย tracking code
 * Public API - ไม่ต้อง auth
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;

    if (!code) {
      return apiResponse.badRequest("Tracking code is required");
    }

    const reimbursementRequestRaw = await prisma.reimbursementRequest.findUnique({
      where: { trackingCode: code },
      select: {
        id: true,
        requesterName: true,
        netAmount: true,
        description: true,
        billDate: true,
        status: true,
        rejectedReason: true,
        createdAt: true,
        approvedAt: true,
        approvedBy: true,
        paidAt: true,
        paidBy: true,
        User_ReimbursementRequest_approvedByToUser: {
          select: { name: true },
        },
        User_ReimbursementRequest_paidByToUser: {
          select: { name: true },
        },
        Company: {
          select: { name: true, logoUrl: true },
        },
      },
    });

    if (!reimbursementRequestRaw) {
      return apiResponse.notFound("Tracking code not found");
    }

    // Map Prisma relation names to client-expected names
    const reimbursementRequest = {
      ...reimbursementRequestRaw,
      approver: reimbursementRequestRaw.User_ReimbursementRequest_approvedByToUser,
      payer: reimbursementRequestRaw.User_ReimbursementRequest_paidByToUser,
      company: reimbursementRequestRaw.Company,
    };

    // Build timeline
    const timeline: Array<{
      status: string;
      label: string;
      date: string;
      by?: string;
    }> = [];

    timeline.push({
      status: "CREATED",
      label: "ส่งคำขอ",
      date: reimbursementRequest.createdAt.toISOString(),
    });

    if (reimbursementRequest.approvedAt) {
      if (reimbursementRequest.status === "REJECTED") {
        timeline.push({
          status: "REJECTED",
          label: "ถูกปฏิเสธ",
          date: reimbursementRequest.approvedAt.toISOString(),
          by: reimbursementRequest.approver?.name,
        });
      } else {
        timeline.push({
          status: "APPROVED",
          label: "อนุมัติแล้ว",
          date: reimbursementRequest.approvedAt.toISOString(),
          by: reimbursementRequest.approver?.name,
        });
      }
    }

    if (reimbursementRequest.paidAt) {
      timeline.push({
        status: "PAID",
        label: "จ่ายเงินแล้ว",
        date: reimbursementRequest.paidAt.toISOString(),
        by: reimbursementRequest.payer?.name,
      });
    }

    return apiResponse.success({
      request: {
        requesterName: reimbursementRequest.requesterName,
        amount: reimbursementRequest.netAmount,
        description: reimbursementRequest.description,
        billDate: reimbursementRequest.billDate,
        status: reimbursementRequest.status,
        rejectedReason: reimbursementRequest.rejectedReason,
        company: reimbursementRequest.company,
        timeline,
      },
    });
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    return apiResponse.error("Failed to fetch tracking information");
  }
}
