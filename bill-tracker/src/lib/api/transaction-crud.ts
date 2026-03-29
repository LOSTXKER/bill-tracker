import { prisma } from "@/lib/db";
import { withAuth } from "./with-auth";
import { withCompanyAccess } from "./with-company-access";
import { apiResponse } from "./response";
import { ApiErrors } from "./errors";
import { hasPermission } from "@/lib/permissions/checker";
import { getBaseIncludes, getInternalCompanyInclude } from "./transaction-includes";
import { runCreateSideEffects, runUpdateSideEffects, runDeleteSideEffects } from "./transaction-effects";
import type { TransactionRouteConfig, RouteParamsContext } from "./transaction-types";

export function createCreateHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withCompanyAccess(
    async (request, { company, session }) => {
      const body = await request.json();
      const createData = config.transformCreateData(body) as Record<string, unknown>;

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

      if (config.afterCreate) {
        await config.afterCreate(item as TModel, body, { session, company });
      }

      await runCreateSideEffects({ config, item, body, session, company, request });

      return apiResponse.created({ [config.modelName]: item });
    },
    {
      permission: config.permissions.create,
      rateLimit: { maxRequests: 30, windowMs: 60000 },
    }
  );
}

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

    const hasAccess = await hasPermission(
      session.user.id,
      item.companyId,
      config.permissions.read
    );

    if (!hasAccess) {
      throw ApiErrors.forbidden("คุณไม่มีสิทธิ์ดูรายการนี้");
    }

    return apiResponse.success({ [config.modelName]: item });
  });
}

export function createUpdateHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withAuth(async (request, { session }, routeContext?: RouteParamsContext) => {
    if (!routeContext) {
      throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    const existingItem = await config.prismaModel.findUnique({
      where: { id },
      include: { Contact: true },
    });

    if (!existingItem) {
      throw ApiErrors.notFound(config.displayName);
    }

    const body = await request.json();

    // Fields that can be updated with change-status permission (workflow-related file uploads)
    const workflowFileFields = [
      "slipUrls", "taxInvoiceUrls", "whtCertUrls", "otherDocUrls",
      "customerSlipUrls", "myBillCopyUrls",
    ];

    const updateKeys = Object.keys(body);
    const isFileOnlyUpdate = updateKeys.length > 0 && updateKeys.every(
      key => workflowFileFields.includes(key)
    );

    const isOwner = existingItem.createdBy === session.user.id;
    const isDraft = existingItem.workflowStatus === "DRAFT";

    let hasAccess = await hasPermission(
      session.user.id,
      existingItem.companyId,
      config.permissions.update
    );

    // Owner can edit their own drafts or upload files to their own items
    if (!hasAccess && isOwner) {
      if (isDraft || isFileOnlyUpdate) {
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
      throw ApiErrors.forbidden("คุณไม่มีสิทธิ์แก้ไขรายการนี้ เฉพาะเจ้าของหรือผู้มีสิทธิ์เท่านั้น");
    }

    // Block changes to financial fields when payment is SETTLED
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
          const numericFields = [
            "amount", "vatRate", "vatAmount", "netPaid",
            "whtRate", "whtAmount",
          ];
          const otherLockedFields = [
            "isWht", "whtType", "paymentMethod",
          ];

          const hasNumericChange = numericFields.some((f) => {
            if (body[f] === undefined) return false;
            return Number(body[f] ?? 0) !== Number(existingItem[f] ?? 0);
          });
          const hasOtherChange = otherLockedFields.some((f) => {
            if (body[f] === undefined) return false;
            return JSON.stringify(body[f]) !== JSON.stringify(existingItem[f]);
          });

          if (hasNumericChange || hasOtherChange) {
            throw ApiErrors.badRequest(
              "ไม่สามารถแก้ไขยอดเงินหรือข้อมูลการชำระเงินได้ เนื่องจากมีการโอนคืนแล้ว กรุณายกเลิกการโอนคืนก่อน"
            );
          }
        }
      }
    }

    const updateData = config.transformUpdateData(body, existingItem as TModel);

    const item = await config.prismaModel.update({
      where: { id },
      data: updateData,
      include: {
        ...getBaseIncludes(config.modelName),
        Company: true,
      },
    });

    if (config.afterUpdate) {
      await config.afterUpdate(item as TModel, body, {
        session,
        company: item.Company!,
        existingItem: existingItem as TModel,
      });
    }

    await runUpdateSideEffects({ config, item, body, existingItem, session });

    return apiResponse.success({ [config.modelName]: item });
  });
}

export function createDeleteHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withAuth(async (request, { session }, routeContext?: RouteParamsContext) => {
    if (!routeContext) {
      throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    const existingItem = await config.prismaModel.findUnique({
      where: { id },
      include: { Contact: true },
    });

    if (!existingItem) {
      throw ApiErrors.notFound(config.displayName);
    }

    if (existingItem.deletedAt) {
      throw ApiErrors.badRequest("รายการนี้ถูกลบไปแล้ว");
    }

    const isOwner = existingItem.createdBy === session.user.id;
    const permission = config.permissions.delete || config.permissions.update;
    const hasDeletePermission = await hasPermission(
      session.user.id,
      existingItem.companyId,
      permission
    );

    if (!isOwner && !hasDeletePermission) {
      throw ApiErrors.forbidden("คุณไม่มีสิทธิ์ลบรายการนี้");
    }

    // For expenses: Refund petty cash if applicable
    if (config.modelName === "expense") {
      const payments = await prisma.expensePayment.findMany({
        where: { expenseId: id },
      });

      for (const payment of payments) {
        if (payment.paidByType === "PETTY_CASH" && payment.paidByPettyCashFundId) {
          await prisma.pettyCashFund.update({
            where: { id: payment.paidByPettyCashFundId },
            data: {
              currentAmount: {
                increment: Number(payment.amount),
              },
            },
          });

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

    await runDeleteSideEffects({ config, item, existingItem, session });

    return apiResponse.success({
      message: "ลบรายการสำเร็จ",
      [config.modelName]: item
    });
  });
}
