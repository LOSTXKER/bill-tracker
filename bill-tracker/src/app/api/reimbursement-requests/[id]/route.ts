import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reimbursement-requests/[id]
 * ดึงข้อมูลคำขอเบิกจ่าย
 */
export async function GET(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;

    const reimbursementRequest = await prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        approver: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true },
        },
        categoryRef: true,
        contact: true,
        company: true,
        linkedExpense: {
          select: { id: true, status: true },
        },
      },
    });

    if (!reimbursementRequest) {
      return apiResponse.notFound("Reimbursement request not found");
    }

    // Check user has access to company
    const hasAccess = await hasPermission(
      session.user.id,
      reimbursementRequest.companyId,
      "reimbursements:read"
    );

    if (!hasAccess) {
      // Allow if user is the requester
      if (reimbursementRequest.requesterId !== session.user.id) {
        return apiResponse.forbidden("You don't have access to this request");
      }
    }

    return apiResponse.success({ request: reimbursementRequest });
  })(request);
}
