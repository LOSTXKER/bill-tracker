/**
 * Generic Notify Routes Factory
 * Creates LINE notification handlers for transaction entities (Expense, Income)
 */

import { prisma } from "@/lib/db";
import { withAuth } from "./with-auth";
import { apiResponse } from "./response";
import { notifyExpense, notifyIncome } from "@/lib/notifications/line-messaging";
import type { TransactionDelegate } from "./transaction-types";

// =============================================================================
// Types
// =============================================================================

export interface NotifyRouteConfig {
  // Entity type
  entityType: "expense" | "income";
  entityName: string;
  
  // Prisma model accessor
  prismaModel: TransactionDelegate;
  
  // Field mappings
  fields: {
    amountField: string;         // "amount"
    netAmountField: string;      // "netPaid" or "netReceived"
    descriptionField: string;    // "description" or "source"
    vatAmountField: string;      // "vatAmount"
    whtField: string;            // "isWht" or "isWhtDeducted"
    whtRateField: string;        // "whtRate"
    whtAmountField: string;      // "whtAmount"
    statusField: string;         // "status"
  };
}

// =============================================================================
// Configs
// =============================================================================

export const expenseNotifyConfig: NotifyRouteConfig = {
  entityType: "expense",
  entityName: "Expense",
  prismaModel: prisma.expense,
  fields: {
    amountField: "amount",
    netAmountField: "netPaid",
    descriptionField: "description",
    vatAmountField: "vatAmount",
    whtField: "isWht",
    whtRateField: "whtRate",
    whtAmountField: "whtAmount",
    statusField: "status",
  },
};

export const incomeNotifyConfig: NotifyRouteConfig = {
  entityType: "income",
  entityName: "Income",
  prismaModel: prisma.income,
  fields: {
    amountField: "amount",
    netAmountField: "netReceived",
    descriptionField: "source",
    vatAmountField: "vatAmount",
    whtField: "isWhtDeducted",
    whtRateField: "whtRate",
    whtAmountField: "whtAmount",
    statusField: "status",
  },
};

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create notify handler for LINE notifications
 */
export function createNotifyHandler(config: NotifyRouteConfig) {
  return (request: Request, routeParams: { params: Promise<{ id: string }> }) => {
    return withAuth(async (req, { session }) => {
      const { id } = await routeParams.params;

      // Get entity with company and contact details
      const entity = await config.prismaModel.findUnique({
        where: { id },
        include: {
          Contact: true,
          Company: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      if (!entity) {
        return apiResponse.notFound(`${config.entityName} not found`);
      }

      // Check user has access to this company
      const access = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: session.user.id,
            companyId: entity.companyId,
          },
        },
      });

      if (!access) {
        return apiResponse.forbidden("Access denied");
      }

      // Get base URL from request
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;

      const company = entity.Company;
      if (!company) {
        return apiResponse.badRequest("Company data not found");
      }

      const contactOrDesc = entity.Contact?.name
        || String(entity[config.fields.descriptionField] ?? "")
        || undefined;
      const desc = String(entity[config.fields.descriptionField] ?? "") || undefined;
      const amount = Number(entity[config.fields.amountField]);
      const vatAmount = entity[config.fields.vatAmountField]
        ? Number(entity[config.fields.vatAmountField])
        : undefined;
      const whtFlag = entity[config.fields.whtField] as boolean | undefined;
      const whtRate = entity[config.fields.whtRateField]
        ? Number(entity[config.fields.whtRateField])
        : undefined;
      const whtAmount = entity[config.fields.whtAmountField]
        ? Number(entity[config.fields.whtAmountField])
        : undefined;
      const netAmount = Number(entity[config.fields.netAmountField]);
      const status = entity[config.fields.statusField] as string;

      let success: boolean;
      if (config.entityType === "expense") {
        success = await notifyExpense(company.id, {
          id: entity.id,
          companyCode: company.code,
          companyName: company.name,
          vendorName: contactOrDesc,
          description: desc,
          amount,
          vatAmount,
          isWht: whtFlag ?? false,
          whtRate,
          whtAmount,
          netPaid: netAmount,
          status,
        }, baseUrl);
      } else {
        success = await notifyIncome(company.id, {
          id: entity.id,
          companyCode: company.code,
          companyName: company.name,
          customerName: contactOrDesc,
          source: desc,
          amount,
          vatAmount,
          isWhtDeducted: whtFlag ?? false,
          whtRate,
          whtAmount,
          netReceived: netAmount,
          status,
        }, baseUrl);
      }

      if (!success) {
        return apiResponse.badRequest(
          "ไม่สามารถส่งการแจ้งเตือนได้ กรุณาตรวจสอบการตั้งค่า LINE Bot"
        );
      }

      return apiResponse.success({ message: "ส่งการแจ้งเตือนสำเร็จ" });
    })(request);
  };
}
