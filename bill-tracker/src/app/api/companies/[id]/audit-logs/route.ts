/**
 * Audit Log API
 * 
 * Endpoints for retrieving audit logs with filtering and pagination
 * Requires audit:read permission
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import type { AuditAction } from "@prisma/client";

/**
 * GET /api/companies/[id]/audit-logs
 * 
 * Get audit logs with filtering and pagination
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - userId: string (filter by user)
 * - action: AuditAction (filter by action type)
 * - entityType: string (filter by entity type)
 * - startDate: ISO string (filter from date)
 * - endDate: ISO string (filter to date)
 * - search: string (search in description)
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get("userId");
    const action = searchParams.get("action") as AuditAction | null;
    const entityType = searchParams.get("entityType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {
      companyId: company.id,
    };

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateObj;
      }
    }

    if (search) {
      where.description = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Execute queries in parallel
    const [logsRaw, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          User: {
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
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    const logs = logsRaw.map((l) => ({ ...l, user: l.User }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return apiResponse.success({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  },
  { permission: "audit:read" }
);

/**
 * POST /api/companies/[id]/audit-logs (for stats)
 * 
 * Get audit log statistics
 */
export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
    // Get stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where = {
      companyId: company.id,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    };

    // Get action counts
    const actionCounts = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: {
        action: true,
      },
    });

    // Get entity type counts
    const entityTypeCounts = await prisma.auditLog.groupBy({
      by: ["entityType"],
      where,
      _count: {
        entityType: true,
      },
      orderBy: {
        _count: {
          entityType: "desc",
        },
      },
      take: 10, // Top 10 entity types
    });

    // Get user activity counts
    const userActivityCounts = await prisma.auditLog.groupBy({
      by: ["userId"],
      where,
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
      take: 10, // Top 10 users
    });

    // Get user details for top users
    const userIds = userActivityCounts.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Combine user activity with user details
    const userActivity = userActivityCounts.map((activity) => {
      const user = users.find((u) => u.id === activity.userId);
      return {
        user,
        count: activity._count.userId,
      };
    });

    // Get total logs count
    const totalLogs = await prisma.auditLog.count({ where });

    // Get logs per day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        companyId: company.id,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by day
    const logsByDay = recentLogs.reduce((acc, log) => {
      const day = log.createdAt.toISOString().split("T")[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return apiResponse.success({
      stats: {
        totalLogs,
        actionCounts: actionCounts.map((a) => ({
          action: a.action,
          count: a._count.action,
        })),
        entityTypeCounts: entityTypeCounts.map((e) => ({
          entityType: e.entityType,
          count: e._count.entityType,
        })),
        userActivity,
        logsByDay,
      },
    });
  },
  { permission: "audit:read" }
);
