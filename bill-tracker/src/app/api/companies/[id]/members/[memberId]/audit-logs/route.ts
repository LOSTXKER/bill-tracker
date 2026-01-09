/**
 * Employee Audit Logs API
 * 
 * Endpoint for fetching employee audit log history
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";

/**
 * GET /api/companies/[id]/members/[memberId]/audit-logs
 * 
 * Get audit logs for a specific employee
 * Query params: action (optional), limit (optional), offset (optional)
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
        return apiResponse.forbidden("You don't have permission to view employee audit logs");
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {
      companyId,
      userId: memberId,
    };

    if (action && action !== "all") {
      where.action = action;
    }

    // Fetch audit logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiResponse.success({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  })(request);
}
