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
import { createLogger } from "@/lib/utils/logger";

// Create logger for this module
const log = createLogger("transaction-routes");

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
    log.error("Failed to create document event", error);
  }
}

// =============================================================================
// Helper: Include Builders
// =============================================================================

const userSelectFields = { id: true, name: true, email: true } as const;

/**
 * Get the creator include for a transaction model.
 * Expense uses User_Expense_createdByToUser, Income uses User.
 */
function getCreatorInclude(modelName: "expense" | "income") {
  return modelName === "expense" 
    ? { User_Expense_createdByToUser: { select: userSelectFields } }
    : { User: { select: userSelectFields } };
}

/**
 * Get the submitter include for a transaction model (for approval workflow).
 */
function getSubmitterInclude(modelName: "expense" | "income") {
  return modelName === "expense"
    ? { User_Expense_submittedByToUser: { select: userSelectFields } }
    : { User_Income_submittedByToUser: { select: userSelectFields } };
}

/**
 * Get the internal company include (only for expense type).
 */
function getInternalCompanyInclude(modelName: "expense" | "income") {
  return modelName === "expense" ? { InternalCompany: true } : {};
}

/**
 * Get base includes for transaction queries.
 * Includes Contact, Account, and model-specific relations.
 */
function getBaseIncludes(modelName: "expense" | "income", options?: { includeSubmitter?: boolean }) {
  return {
    Contact: true,
    Account: true,
    ...getCreatorInclude(modelName),
    ...(options?.includeSubmitter ? getSubmitterInclude(modelName) : {}),
    ...getInternalCompanyInclude(modelName),
  };
}

// =============================================================================
// Types
// =============================================================================

import type { Session } from "next-auth";
import type { Company, Expense, Income, Prisma } from "@prisma/client";

/**
 * Supported transaction model names
 */
export type TransactionModelName = "expense" | "income";

/**
 * Context provided to hooks after create/update operations
 */
export interface TransactionHookContext {
  session: Session;
  company: Company;
}

/**
 * Context provided to afterUpdate hook (includes existing item)
 */
export interface TransactionUpdateHookContext<TModel> extends TransactionHookContext {
  existingItem: TModel;
}

/**
 * Request body type for transactions (used in transform functions)
 */
export interface TransactionRequestBody {
  // Common fields
  amount?: number;
  vatRate?: number;
  vatAmount?: number;
  netPaid?: number;
  netReceived?: number;
  description?: string;
  source?: string;
  contactId?: string;
  contactName?: string;
  accountId?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  notes?: string;
  referenceNo?: string;
  
  // WHT fields (expense)
  isWht?: boolean;
  // WHT fields (income)
  isWhtDeducted?: boolean;
  // Common WHT fields
  whtRate?: number;
  whtAmount?: number;
  whtType?: string;
  _whtChangeConfirmed?: boolean;
  _whtChangeReason?: string;
  
  // Document URLs (expense)
  taxInvoiceUrls?: string[];
  slipUrls?: string[];
  // Document URLs (income)
  customerSlipUrls?: string[];
  myBillCopyUrls?: string[];
  // Common document URLs
  whtCertUrls?: string[];
  otherDocUrls?: string[];
  referenceUrls?: string[];
  
  // Date fields
  billDate?: string | Date;
  incomeDate?: string | Date;
  receiveDate?: string | Date;
  dueDate?: string | Date;
  
  // Workflow fields
  documentType?: string;
  workflowStatus?: string;
  internalCompanyId?: string;
  status?: string;
  
  // Currency conversion fields
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  
  // Allow additional fields
  [key: string]: unknown;
}

/**
 * Prisma delegate types for transactions
 * Note: Using 'any' for TransactionDelegate because union of Prisma delegates
 * causes TypeScript errors due to incompatible method signatures
 */
export type ExpenseDelegate = typeof prisma.expense;
export type IncomeDelegate = typeof prisma.income;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransactionDelegate = any;

/**
 * Configuration for transaction route factory
 */
export interface TransactionRouteConfig<
  TModel = Expense | Income,
  TCreateData = Prisma.ExpenseCreateInput | Prisma.IncomeCreateInput,
  TUpdateData = Prisma.ExpenseUpdateInput | Prisma.IncomeUpdateInput
> {
  /** Model name for Prisma - "expense" or "income" */
  modelName: TransactionModelName;
  
  /** Permission strings required for each operation */
  permissions: {
    read: string;
    create: string;
    update: string;
    delete?: string;
  };
  
  /** Field name mappings */
  fields: {
    dateField: string;      // "billDate" or "receiveDate"
    netAmountField: string; // "netPaid" or "netReceived"
    statusField: string;
  };
  
  /** Prisma model accessor */
  prismaModel: TransactionDelegate;
  
  /** Transform request body to create data */
  transformCreateData: (body: TransactionRequestBody) => TCreateData;
  
  /** Transform request body to update data (optionally using existing data for conditional logic) */
  transformUpdateData: (body: TransactionRequestBody, existingData?: TModel) => TUpdateData;
  
  /** Hook called after successful creation */
  afterCreate?: (item: TModel, body: TransactionRequestBody, context: TransactionHookContext) => Promise<void>;
  
  /** Hook called after successful update */
  afterUpdate?: (item: TModel, body: TransactionRequestBody, context: TransactionUpdateHookContext<TModel>) => Promise<void>;
  
  /** Handler for LINE notifications on create */
  notifyCreate?: (companyId: string, data: Record<string, unknown>, baseUrl: string) => Promise<void>;
  
  /** Display name for audit logs (e.g., "Expense", "Income") */
  displayName: string;
  
  /** Optional function to get entity display name for audit logs */
  getEntityDisplayName?: (entity: TModel) => string | undefined;
}

/**
 * Route params context type for dynamic routes
 */
export interface RouteParamsContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create GET handler for listing transactions
 */
export function createListHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withCompanyAccess(
    async (request, { company, session }) => {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const workflowStatus = searchParams.get("workflowStatus");
      const approvalStatus = searchParams.get("approvalStatus");
      const tab = searchParams.get("tab"); // draft | pending | rejected | all
      const category = searchParams.get("category");
      const contact = searchParams.get("contact");
      const search = searchParams.get("search");
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");
      const includeDeleted = searchParams.get("includeDeleted") === "true";
      const includeReimbursements = searchParams.get("includeReimbursements") === "true";
      const onlyMine = searchParams.get("onlyMine") === "true"; // Only show items created by current user
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const sortBy = searchParams.get("sortBy") || "createdAt";
      const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

      // Base where clause
      const where: any = {
        companyId: company.id,
        ...(status && { [config.fields.statusField]: status as any }),
        ...(workflowStatus && { workflowStatus: workflowStatus as any }),
        ...(approvalStatus && { approvalStatus: approvalStatus as any }),
        ...(category && { accountId: category }),
        ...(contact && { contactId: contact }),
        // Soft delete filter - exclude deleted items unless explicitly requested
        ...(!includeDeleted && { deletedAt: null }),
        // Only my items filter
        ...(onlyMine && { createdBy: session.user.id }),
      };

      // Tab-based filtering
      // These provide convenient preset filters
      if (tab === "draft") {
        // Show only drafts created by current user
        where.workflowStatus = "DRAFT";
        where.createdBy = session.user.id;
      } else if (tab === "pending") {
        // Show items pending approval (for approvers)
        where.approvalStatus = "PENDING";
      } else if (tab === "rejected") {
        // Show rejected items created by current user
        where.approvalStatus = "REJECTED";
        where.createdBy = session.user.id;
      } else if (tab === "active") {
        // Show active items (not draft, approval is done or not required)
        where.workflowStatus = { not: "DRAFT" };
        where.OR = [
          { approvalStatus: "NOT_REQUIRED" },
          { approvalStatus: "APPROVED" },
        ];
      }
      // Default (tab === "all" or no tab): show all items based on other filters

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
        // If we already have an OR filter from tab, we need to handle this differently
        if (where.OR) {
          // Wrap existing OR with AND, then add search OR
          const existingOr = where.OR;
          delete where.OR;
          where.AND = [
            { OR: existingOr },
            { OR: [{ description: { contains: search, mode: "insensitive" } }] },
          ];
        } else {
          where.OR = [
            { description: { contains: search, mode: "insensitive" } },
          ];
        }
      }

      // For expenses, filter out reimbursements that are not PAID
      // Reimbursements should only appear as expenses after they're paid
      // REJECTED reimbursements should never appear as expenses
      if (config.modelName === "expense" && !includeReimbursements && !tab) {
        // Only apply this filter if not using tab-based filtering
        // Tab filters might want to show draft reimbursements
        if (!where.OR) {
          where.OR = [
            // Regular expenses (not reimbursements)
            { isReimbursement: false },
            // Reimbursements that have been paid (now part of normal expense flow)
            { isReimbursement: true, reimbursementStatus: "PAID" },
          ];
        }
      }

      // Get includes using helper functions
      const includes = getBaseIncludes(config.modelName, { includeSubmitter: true });

      const [items, total] = await Promise.all([
        config.prismaModel.findMany({
          where,
          include: includes,
          // Sort by user-selected field, then by createdAt for consistent ordering
          orderBy: [
            { [sortBy]: sortOrder },
            ...(sortBy !== "createdAt" ? [{ createdAt: "desc" }] : []),
          ],
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
export function createCreateHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withCompanyAccess(
    async (request, { company, session }) => {
      const body = await request.json();
      const createData = config.transformCreateData(body) as Record<string, unknown>;

      // Create transaction with base includes
      const item = await config.prismaModel.create({
        data: {
          ...createData,
          companyId: company.id,
          createdBy: session.user.id,
        },
        include: {
          Contact: true,
          Account: true,
          ...getInternalCompanyInclude(config.modelName),
        },
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
      }).catch((e) => log.error("Failed to create document event", e));

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
        log.error("Failed to create in-app notification", error);
      });

      // Send LINE notification (non-blocking)
      if (config.notifyCreate) {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        
        // Pass actual created item data (not just body) for notification
        config.notifyCreate(company.id, {
          id: item.id,
          companyCode: company.code,
          companyName: company.name,
          // Include both body (for form data like vendorName) and item (for DB values like status)
          ...body,
          // Override with actual values from created item
          status: item.workflowStatus || item.status,
          workflowStatus: item.workflowStatus,
          amount: item.amount,
          vatAmount: item.vatAmount,
          netPaid: item.netPaid,
          netReceived: item.netReceived,
          isWht: item.isWht,
          isWhtDeducted: item.isWhtDeducted,
          whtRate: item.whtRate,
          whtAmount: item.whtAmount,
        }, baseUrl).catch((error) => {
          log.error("Failed to send LINE notification", error);
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
export function createGetHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withAuth(async (request, { session }, routeContext?: RouteParamsContext) => {
    if (!routeContext) {
      throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    const item = await config.prismaModel.findUnique({
      where: { id },
      include: {
        ...getBaseIncludes(config.modelName),
        Company: true,
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
export function createUpdateHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withAuth(async (request, { session }, routeContext?: RouteParamsContext) => {
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

    // Clone request to read body for permission check
    const clonedRequest = request.clone();
    const bodyForCheck = await clonedRequest.json();
    
    // Fields that can be updated with change-status permission (workflow-related file uploads)
    const workflowFileFields = [
      "slipUrls", "taxInvoiceUrls", "whtCertUrls", "otherDocUrls",
      "customerSlipUrls", "myBillCopyUrls",
    ];
    
    // Check if update only contains file URL fields
    const updateKeys = Object.keys(bodyForCheck);
    const isFileOnlyUpdate = updateKeys.length > 0 && updateKeys.every(
      key => workflowFileFields.includes(key)
    );
    
    // Check if user is the owner of this item
    const isOwner = existingItem.createdBy === session.user.id;
    
    // Check if item is in DRAFT status (owner can edit their drafts)
    const isDraft = existingItem.workflowStatus === "DRAFT";
    
    // Check access - allow change-status permission for file-only updates
    let hasAccess = await hasPermission(
      session.user.id,
      existingItem.companyId,
      config.permissions.update
    );
    
    // Owner can edit their own drafts or upload files to their own items
    if (!hasAccess && isOwner) {
      if (isDraft) {
        // Owner can edit all fields of their own drafts
        hasAccess = true;
      } else if (isFileOnlyUpdate) {
        // Owner can upload files to their own items (even after submission)
        hasAccess = true;
      }
    }
    
    // If still no access and it's a file-only update, check for change-status permission
    if (!hasAccess && isFileOnlyUpdate) {
      const changeStatusPerm = config.modelName === "expense" 
        ? "expenses:change-status" 
        : "incomes:change-status";
      hasAccess = await hasPermission(
        session.user.id,
        existingItem.companyId,
        changeStatusPerm
      );
    }

    if (!hasAccess) {
      throw ApiErrors.forbidden();
    }

    // For expenses: Check if any payment is SETTLED (prevent editing payer-related fields)
    // Only block when the expense is already approved/not-required AND has settled payments
    // Unapproved expenses (PENDING/REJECTED) should always be editable
    if (config.modelName === "expense") {
      const approvalDone =
        existingItem.approvalStatus === "APPROVED" ||
        existingItem.approvalStatus === "NOT_REQUIRED";

      if (approvalDone) {
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
    }

    // Use the body we already parsed for permission check
    const body = bodyForCheck;
    // Pass existingItem to transformUpdateData for conditional logic (e.g., WHT workflow adjustment)
    const updateData = config.transformUpdateData(body, existingItem);

    // Update item with base includes
    const item = await config.prismaModel.update({
      where: { id },
      data: updateData,
      include: {
        ...getBaseIncludes(config.modelName),
        Company: true,
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
        }).catch((e) => log.error("Failed to create file upload event", e));
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
        }).catch((e) => log.error("Failed to create file removal event", e));
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
      log.error("Failed to create in-app notification", error);
    });

    return apiResponse.success({ [config.modelName]: item });
  });
}

/**
 * Create DELETE handler for soft deleting transactions
 */
export function createDeleteHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withAuth(async (request, { session }, routeContext?: RouteParamsContext) => {
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

    // Note: We allow deletion of expenses even if they have SETTLED payments
    // The settlement history will still show the deleted expense for audit purposes

    // Check access - Owner can delete their own items, or need delete/update permission
    const isOwner = existingItem.createdBy === session.user.id;
    const permission = config.permissions.delete || config.permissions.update;
    const hasDeletePermission = await hasPermission(
      session.user.id,
      existingItem.companyId,
      permission
    );

    // Allow deletion if: owner of the item OR has delete permission
    if (!isOwner && !hasDeletePermission) {
      throw ApiErrors.forbidden("คุณไม่มีสิทธิ์ลบรายการนี้");
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
      log.error("Failed to create in-app notification", error);
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
