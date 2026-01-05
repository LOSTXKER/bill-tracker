/**
 * Generic Transaction Routes Factory
 * Creates CRUD handlers for transaction-like entities (Expense, Income)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "./with-company-access";
import { withAuth } from "./with-auth";
import { apiResponse } from "./response";
import { ApiErrors } from "./errors";
import { hasPermission } from "@/lib/permissions/checker";
import { logCreate, logUpdate, logStatusChange, logDelete } from "@/lib/audit/logger";

// =============================================================================
// Types
// =============================================================================

export interface TransactionRouteConfig<TModel, TCreateData, TUpdateData> {
  // Model name for Prisma
  modelName: "expense" | "income";
  
  // Permissions
  permissions: {
    read: string;
    create: string;
    update: string;
    delete?: string;
  };
  
  // Field mappings
  fields: {
    dateField: string; // "billDate" or "receiveDate"
    netAmountField: string; // "netPaid" or "netReceived"
    statusField: string;
  };
  
  // Prisma model accessor
  prismaModel: any; // prisma.expense or prisma.income
  
  // Data transformation
  transformCreateData: (body: any) => TCreateData;
  transformUpdateData: (body: any) => TUpdateData;
  
  // Notification handler (optional)
  notifyCreate?: (companyId: string, data: any, baseUrl: string) => Promise<void>;
  
  // Display name for audit logs
  displayName: string;
  getEntityDisplayName?: (entity: TModel) => string | undefined;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create GET handler for listing transactions
 */
export function createListHandler<TModel>(config: TransactionRouteConfig<TModel, any, any>) {
  return withCompanyAccess(
    async (request, { company }) => {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const includeDeleted = searchParams.get("includeDeleted") === "true";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");

      const where = {
        companyId: company.id,
        ...(status && { [config.fields.statusField]: status as any }),
        // Soft delete filter - exclude deleted items unless explicitly requested
        ...(!includeDeleted && { deletedAt: null }),
      };

      const [items, total] = await Promise.all([
        config.prismaModel.findMany({
          where,
          include: {
            contact: true,
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { [config.fields.dateField]: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        config.prismaModel.count({ where }),
      ]);

      return apiResponse.success({
        [config.modelName + "s"]: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },
    { permission: config.permissions.read }
  );
}

/**
 * Create POST handler for creating transactions
 */
export function createCreateHandler<TModel>(config: TransactionRouteConfig<TModel, any, any>) {
  return withCompanyAccess(
    async (request, { company, session }) => {
      const body = await request.json();
      const createData = config.transformCreateData(body);

      // Create transaction
      const item = await config.prismaModel.create({
        data: {
          ...createData,
          companyId: company.id,
          createdBy: session.user.id,
        },
        include: { contact: true },
      });

      // Create audit log
      await logCreate(config.displayName, item, session.user.id, company.id);

      // Send notification (non-blocking)
      if (config.notifyCreate) {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        
        config.notifyCreate(company.id, {
          id: item.id,
          companyCode: company.code,
          companyName: company.name,
          ...body,
        }, baseUrl).catch((error) => {
          console.error("Failed to send notification:", error);
        });
      }

      return apiResponse.created({ [config.modelName]: item });
    },
    {
      permission: config.permissions.create,
      rateLimit: { maxRequests: 30, windowMs: 60000 },
    }
  );
}

/**
 * Create GET handler for single transaction
 */
export function createGetHandler<TModel>(config: TransactionRouteConfig<TModel, any, any>) {
  return withAuth(async (request, { session }, routeContext?: any) => {
    if (!routeContext) {
      throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    const item = await config.prismaModel.findUnique({
      where: { id },
      include: {
        contact: true,
        company: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!item) {
      throw ApiErrors.notFound(config.displayName);
    }

    // Check access
    const hasAccess = await hasPermission(
      session.user.id,
      item.companyId,
      config.permissions.read
    );

    if (!hasAccess) {
      throw ApiErrors.forbidden();
    }

    return apiResponse.success({ [config.modelName]: item });
  });
}

/**
 * Create PUT handler for updating transactions
 */
export function createUpdateHandler<TModel>(config: TransactionRouteConfig<TModel, any, any>) {
  return withAuth(async (request, { session }, routeContext?: any) => {
    if (!routeContext) {
      throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    // Find existing item
    const existingItem = await config.prismaModel.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!existingItem) {
      throw ApiErrors.notFound(config.displayName);
    }

    // Check access
    const hasAccess = await hasPermission(
      session.user.id,
      existingItem.companyId,
      config.permissions.update
    );

    if (!hasAccess) {
      throw ApiErrors.forbidden();
    }

    const body = await request.json();
    const updateData = config.transformUpdateData(body);

    // Update item
    const item = await config.prismaModel.update({
      where: { id },
      data: updateData,
      include: {
        contact: true,
        company: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    const statusField = config.fields.statusField;
    if (body[statusField] && body[statusField] !== existingItem[statusField]) {
      await logStatusChange(
        config.displayName,
        item.id,
        existingItem[statusField],
        body[statusField],
        session.user.id,
        item.companyId,
        config.getEntityDisplayName?.(item)
      );
    } else {
      await logUpdate(
        config.displayName,
        item.id,
        existingItem,
        item,
        session.user.id,
        item.companyId
      );
    }

    return apiResponse.success({ [config.modelName]: item });
  });
}

/**
 * Create DELETE handler for soft deleting transactions
 */
export function createDeleteHandler<TModel>(config: TransactionRouteConfig<TModel, any, any>) {
  return withAuth(async (request, { session }, routeContext?: any) => {
    if (!routeContext) {
      throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    // Find existing item
    const existingItem = await config.prismaModel.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!existingItem) {
      throw ApiErrors.notFound(config.displayName);
    }

    // Check if already deleted
    if (existingItem.deletedAt) {
      throw ApiErrors.badRequest("รายการนี้ถูกลบไปแล้ว");
    }

    // Check access (use delete permission if defined, otherwise use update permission)
    const permission = config.permissions.delete || config.permissions.update;
    const hasAccess = await hasPermission(
      session.user.id,
      existingItem.companyId,
      permission
    );

    if (!hasAccess) {
      throw ApiErrors.forbidden();
    }

    // Soft delete - update deletedAt and deletedBy
    const item = await config.prismaModel.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
      include: {
        contact: true,
        company: true,
      },
    });

    // Create audit log
    await logDelete(
      config.displayName,
      existingItem,
      session.user.id,
      item.companyId
    );

    return apiResponse.success({ 
      message: "ลบรายการสำเร็จ",
      [config.modelName]: item 
    });
  });
}

// =============================================================================
// Helper to create all CRUD routes at once
// =============================================================================

export function createTransactionRoutes<TModel, TCreateData, TUpdateData>(
  config: TransactionRouteConfig<TModel, TCreateData, TUpdateData>
) {
  return {
    list: createListHandler(config),
    create: createCreateHandler(config),
    get: createGetHandler(config),
    update: createUpdateHandler(config),
    delete: createDeleteHandler(config),
  };
}
