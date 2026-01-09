/**
 * Employee Reimbursements API
 * 
 * Endpoint for fetching employee reimbursement history
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";

/**
 * GET /api/companies/[id]/members/[memberId]/reimbursements
 * 
 * Get all reimbursement requests for a specific employee
 * Query params: status (optional), limit (optional), offset (optional)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  return withAuth(async (req, { session }) => {
    const { id: companyId, memberId } = await params;

    // Check if user has permission to view employee data
    const isOwnProfile = session.user.id === memberId;
    
    if (!isOwnProfile) {
      const canManageTeam = await hasPermission(
        session.user.id,
        companyId,
        "settings:manage-team"
      );

      if (!canManageTeam) {
        return apiResponse.forbidden("You don't have permission to view employee reimbursements");
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {
      companyId,
      requesterId: memberId,
    };

    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    // Fetch reimbursements
    const [reimbursements, total] = await Promise.all([
      prisma.reimbursementRequest.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          categoryRef: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          billDate: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.reimbursementRequest.count({ where }),
    ]);

    return apiResponse.success({
      reimbursements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  })(request);
}
