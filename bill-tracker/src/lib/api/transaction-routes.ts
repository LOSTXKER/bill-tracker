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
import { logCreate, logUpdate, logStatusChange, logDelete, logWhtChange } from "@/lib/audit/logger";
import { DocumentEventType } from "@prisma/client";
import { notifyTransactionChange } from "@/lib/notifications/in-app";

// =============================================================================
// Helper: Create Document Event
// =============================================================================

async function createDocumentEvent(params: {
  expenseId?: string;
  incomeId?: string;
  eventType: DocumentEventType;
  fromStatus?: string | null;
  toStatus?: string | null;
  notes?: string | null;
  metadata?: any;
  createdBy: string;
}): Promise<void> {
  try {
    await prisma.documentEvent.create({
      data: {
        id: crypto.randomUUID(),
        expenseId: params.expenseId || null,
        incomeId: params.incomeId || null,
        eventType: params.eventType,
        eventDate: new Date(),
        fromStatus: params.fromStatus || null,
        toStatus: params.toStatus || null,
        notes: params.notes || null,
        metadata: params.metadata || null,
        createdBy: params.createdBy,
      },
    });
  } catch (error) {
    // Log error but don't throw - document events should not break the main flow
    console.error("Failed to create document event:", error);
  }
}

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
  transformUpdateData: (body: any, existingData?: any) => TUpdateData;
  
  // Post-create/update hooks (optional)
  afterCreate?: (item: TModel, body: any, context: { session: any; company: any }) => Promise<void>;
  afterUpdate?: (item: TModel, body: any, context: { session: any; company: any; existingItem: any }) => Promise<void>;
  
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
      const category = searchParams.get("category");
      const contact = searchParams.get("contact");
      const search = searchParams.get("search");
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");
      const includeDeleted = searchParams.get("includeDeleted") === "true";
      const includeReimbursements = searchParams.get("includeReimbursements") === "true";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");

      // Base where clause
      const where: any = {
        companyId: company.id,
        ...(status && { [config.fields.statusField]: status as any }),
        ...(category && { accountId: category }),
        ...(contact && { contactId: contact }),
        // Soft delete filter - exclude deleted items unless explicitly requested
        ...(!includeDeleted && { deletedAt: null }),
      };

      // Date range filter
      if (dateFrom || dateTo) {
        where[config.fields.dateField] = {};
        if (dateFrom) {
          where[config.fields.dateField].gte = new Date(dateFrom);
        }
        if (dateTo) {
          where[config.fields.dateField].lte = new Date(dateTo);
        }
      }

      // Search filter (description)
      if (search) {
        where.OR = [
          ...(where.OR || []),
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      // For expenses, filter out reimbursements that are not PAID
      // Reimbursements should only appear as expenses after they're paid
      // REJECTED reimbursements should never appear as expenses
      if (config.modelName === "expense" && !includeReimbursements) {
        where.OR = [
          // Regular expenses (not reimbursements)
          { isReimbursement: false },
          // Reimbursements that have been paid (now part of normal expense flow)
          { isReimbursement: true, reimbursementStatus: "PAID" },
        ];
      }

      // Use PascalCase relation names as per Prisma schema
      // Creator relation differs: Expense uses User_Expense_createdByToUser, Income uses User
      const creatorInclude = config.modelName === "expense" 
        ? { User_Expense_createdByToUser: { select: { id: true, name: true, email: true } } }
        : { User: { select: { id: true, name: true, email: true } } };

      const [items, total] = await Promise.all([
        config.prismaModel.findMany({
          where,
          include: {
            Contact: true,
            Account: true,
            ...creatorInclude,
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
        include: { Contact: true, Account: true },
      });

      // Run afterCreate hook if defined
      if (config.afterCreate) {
        await config.afterCreate(item, body, { session, company });
      }

      // Create audit log
      await logCreate(config.displayName, item, session.user.id, company.id);

      // Create document event for creation (non-blocking)
      createDocumentEvent({
        expenseId: config.modelName === "expense" ? item.id : undefined,
        incomeId: config.modelName === "income" ? item.id : undefined,
        eventType: "CREATED",
        toStatus: item.workflowStatus || item.status,
        notes: null,
        createdBy: session.user.id,
      }).catch((e) => console.error("Failed to create document event:", e));

      // Send in-app notification (non-blocking)
      notifyTransactionChange({
        companyId: company.id,
        transactionType: config.modelName,
        transactionId: item.id,
        action: "created",
        actorId: session.user.id,
        actorName: session.user.name || "ผู้ใช้",
        transactionDescription: item.description,
        amount: Number(item[config.fields.netAmountField]),
      }).catch((error) => {
        console.error("Failed to create in-app notification:", error);
      });

      // Send LINE notification (non-blocking)
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

    // Use PascalCase relation names as per Prisma schema
    // Creator relation differs: Expense uses User_Expense_createdByToUser, Income uses User
    const creatorInclude = config.modelName === "expense" 
      ? { User_Expense_createdByToUser: { select: { id: true, name: true, email: true } } }
      : { User: { select: { id: true, name: true, email: true } } };

    const item = await config.prismaModel.findUnique({
      where: { id },
      include: {
        Contact: true,
        Account: true,
        Company: true,
        ...creatorInclude,
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
      include: { Contact: true },
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

    // For expenses: Check if any payment is SETTLED (prevent editing payer-related fields)
    if (config.modelName === "expense") {
      const settledPayments = await prisma.expensePayment.findFirst({
        where: {
          expenseId: id,
          settlementStatus: "SETTLED",
        },
      });

      if (settledPayments) {
        throw ApiErrors.badRequest(
          "ไม่สามารถแก้ไขรายจ่ายนี้ได้ เนื่องจากมีการโอนคืนแล้ว กรุณายกเลิกการโอนคืนก่อน"
        );
      }
    }

    const body = await request.json();
    // Pass existingItem to transformUpdateData for conditional logic (e.g., WHT workflow adjustment)
    const updateData = config.transformUpdateData(body, existingItem);

    // Use PascalCase relation names as per Prisma schema
    const creatorInclude = config.modelName === "expense" 
      ? { User_Expense_createdByToUser: { select: { id: true, name: true, email: true } } }
      : { User: { select: { id: true, name: true, email: true } } };

    // Update item
    const item = await config.prismaModel.update({
      where: { id },
      data: updateData,
      include: {
        Contact: true,
        Account: true,
        Company: true,
        ...creatorInclude,
      },
    });

    // Run afterUpdate hook if defined
    if (config.afterUpdate) {
      await config.afterUpdate(item, body, { session, company: item.Company, existingItem });
    }

    // Create audit log
    const statusField = config.fields.statusField;
    const isStatusChange = body[statusField] && body[statusField] !== existingItem[statusField];
    
    // Check if WHT changed
    const whtField = config.modelName === "expense" ? "isWht" : "isWhtDeducted";
    const wasWht = existingItem[whtField];
    const nowWht = item[whtField];
    const isWhtChange = wasWht !== nowWht;
    
    if (isWhtChange) {
      // Log WHT-specific change
      const statusRollback = existingItem.workflowStatus !== item.workflowStatus
        ? { from: existingItem.workflowStatus, to: item.workflowStatus }
        : undefined;
      
      await logWhtChange(
        config.displayName as "Expense" | "Income",
        item.id,
        wasWht,
        nowWht,
        body._whtChangeReason,
        statusRollback,
        session.user.id,
        item.companyId,
        config.getEntityDisplayName?.(item)
      );
    } else if (isStatusChange) {
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

    // Create document events for file changes (non-blocking)
    const fileFields = config.modelName === "expense"
      ? { slipUrls: "สลิปโอนเงิน", taxInvoiceUrls: "ใบกำกับภาษี", whtCertUrls: "ใบ 50 ทวิ" }
      : { customerSlipUrls: "สลิปลูกค้า", myBillCopyUrls: "สำเนาบิล", whtCertUrls: "ใบ 50 ทวิ" };

    for (const [field, label] of Object.entries(fileFields)) {
      const oldUrls: string[] = existingItem[field] || [];
      const newUrls: string[] = body[field] || oldUrls;
      
      // Check for new files (files in newUrls but not in oldUrls)
      const addedUrls = newUrls.filter((url: string) => url && !oldUrls.includes(url));
      // Check for removed files
      const removedUrls = oldUrls.filter((url: string) => url && !newUrls.includes(url));
      
      if (addedUrls.length > 0) {
        createDocumentEvent({
          expenseId: config.modelName === "expense" ? item.id : undefined,
          incomeId: config.modelName === "income" ? item.id : undefined,
          eventType: "FILE_UPLOADED",
          fromStatus: existingItem.workflowStatus,
          toStatus: item.workflowStatus,
          notes: `อัปโหลด${label} ${addedUrls.length} ไฟล์`,
          metadata: { fileType: field, addedUrls },
          createdBy: session.user.id,
        }).catch((e) => console.error("Failed to create file upload event:", e));
      }
      
      if (removedUrls.length > 0) {
        createDocumentEvent({
          expenseId: config.modelName === "expense" ? item.id : undefined,
          incomeId: config.modelName === "income" ? item.id : undefined,
          eventType: "FILE_REMOVED",
          fromStatus: existingItem.workflowStatus,
          toStatus: item.workflowStatus,
          notes: `ลบ${label} ${removedUrls.length} ไฟล์`,
          metadata: { fileType: field, removedUrls },
          createdBy: session.user.id,
        }).catch((e) => console.error("Failed to create file removal event:", e));
      }
    }

    // Calculate changed fields for notification
    const changedFields: string[] = [];
    const fieldLabels: Record<string, string> = {
      amount: "ยอดเงิน",
      description: "รายละเอียด",
      contactId: "ผู้ติดต่อ",
      accountId: "หมวดหมู่",
      vatAmount: "VAT",
      whtAmount: "หัก ณ ที่จ่าย",
      paymentMethod: "วิธีชำระ",
      invoiceNumber: "เลขที่เอกสาร",
    };
    
    Object.keys(fieldLabels).forEach((field) => {
      if (body[field] !== undefined && 
          JSON.stringify(existingItem[field]) !== JSON.stringify(body[field])) {
        changedFields.push(fieldLabels[field]);
      }
    });

    // Send in-app notification (non-blocking)
    notifyTransactionChange({
      companyId: item.companyId,
      transactionType: config.modelName,
      transactionId: item.id,
      action: isStatusChange ? "status_changed" : "updated",
      actorId: session.user.id,
      actorName: session.user.name || "ผู้ใช้",
      transactionDescription: item.description,
      amount: Number(item[config.fields.netAmountField]),
      oldStatus: isStatusChange ? existingItem[statusField] : undefined,
      newStatus: isStatusChange ? body[statusField] : undefined,
      changedFields: changedFields.length > 0 ? changedFields : undefined,
    }).catch((error) => {
      console.error("Failed to create in-app notification:", error);
    });

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
      include: { Contact: true },
    });

    if (!existingItem) {
      throw ApiErrors.notFound(config.displayName);
    }

    // Check if already deleted
    if (existingItem.deletedAt) {
      throw ApiErrors.badRequest("รายการนี้ถูกลบไปแล้ว");
    }

    // For expenses: Check if any payment is SETTLED (prevent deletion)
    if (config.modelName === "expense") {
      const settledPayments = await prisma.expensePayment.findFirst({
        where: {
          expenseId: id,
          settlementStatus: "SETTLED",
        },
      });

      if (settledPayments) {
        throw ApiErrors.badRequest(
          "ไม่สามารถลบรายจ่ายนี้ได้ เนื่องจากมีการโอนคืนแล้ว กรุณายกเลิกการโอนคืนก่อน"
        );
      }
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

    // For expenses: Refund petty cash if applicable
    if (config.modelName === "expense") {
      const payments = await prisma.expensePayment.findMany({
        where: { expenseId: id },
      });

      // Refund petty cash funds
      for (const payment of payments) {
        if (payment.paidByType === "PETTY_CASH" && payment.paidByPettyCashFundId) {
          // Return money to fund
          await prisma.pettyCashFund.update({
            where: { id: payment.paidByPettyCashFundId },
            data: {
              currentAmount: {
                increment: Number(payment.amount),
              },
            },
          });

          // Create adjustment transaction
          await prisma.pettyCashTransaction.create({
            data: {
              fundId: payment.paidByPettyCashFundId,
              type: "ADJUSTMENT",
              amount: Number(payment.amount),
              description: `คืนเงินจากการลบรายจ่าย: ${existingItem.description || "ไม่ระบุ"}`,
              createdBy: session.user.id,
            },
          });
        }
      }
    }

    // Soft delete - update deletedAt and deletedBy
    const item = await config.prismaModel.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
      include: {
        Contact: true,
        Company: true,
      },
    });

    // Create audit log
    await logDelete(
      config.displayName,
      existingItem,
      session.user.id,
      item.companyId
    );

    // Send in-app notification (non-blocking)
    notifyTransactionChange({
      companyId: item.companyId,
      transactionType: config.modelName,
      transactionId: item.id,
      action: "deleted",
      actorId: session.user.id,
      actorName: session.user.name || "ผู้ใช้",
      transactionDescription: existingItem.description,
      amount: Number(existingItem[config.fields.netAmountField]),
    }).catch((error) => {
      console.error("Failed to create in-app notification:", error);
    });

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
