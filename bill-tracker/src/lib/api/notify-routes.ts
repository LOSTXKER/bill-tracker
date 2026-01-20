/**
 * Generic Notify Routes Factory
 * Creates LINE notification handlers for transaction entities (Expense, Income)
 */

import { prisma } from "@/lib/db";
import { withAuth } from "./with-auth";
import { apiResponse } from "./response";
import { notifyExpense, notifyIncome } from "@/lib/notifications/line-messaging";

// =============================================================================
// Types
// =============================================================================

export interface NotifyRouteConfig {
  // Entity type
  entityType: "expense" | "income";
  entityName: string;
  
  // Prisma model accessor
  prismaModel: any;
  
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

      // Build notification data
      const notifyData = {
        id: entity.id,
        companyCode: entity.Company.code,
        companyName: entity.Company.name,
        [config.entityType === "expense" ? "vendorName" : "customerName"]: 
          entity.Contact?.name || entity[config.fields.descriptionField] || undefined,
        [config.fields.descriptionField]: entity[config.fields.descriptionField] || undefined,
        amount: Number(entity[config.fields.amountField]),
        vatAmount: entity[config.fields.vatAmountField] 
          ? Number(entity[config.fields.vatAmountField]) 
          : undefined,
        [config.fields.whtField]: entity[config.fields.whtField],
        whtRate: entity[config.fields.whtRateField] 
          ? Number(entity[config.fields.whtRateField]) 
          : undefined,
        whtAmount: entity[config.fields.whtAmountField] 
          ? Number(entity[config.fields.whtAmountField]) 
          : undefined,
        [config.fields.netAmountField]: Number(entity[config.fields.netAmountField]),
        status: entity[config.fields.statusField],
      };

      // Send notification based on entity type
      let success: boolean;
      if (config.entityType === "expense") {
        success = await notifyExpense(entity.Company.id, {
          id: notifyData.id,
          companyCode: notifyData.companyCode,
          companyName: notifyData.companyName,
          vendorName: notifyData.vendorName,
          description: notifyData.description,
          amount: notifyData.amount,
          vatAmount: notifyData.vatAmount,
          isWht: notifyData.isWht,
          whtRate: notifyData.whtRate,
          whtAmount: notifyData.whtAmount,
          netPaid: notifyData.netPaid,
          status: notifyData.status,
        }, baseUrl);
      } else {
        success = await notifyIncome(entity.Company.id, {
          id: notifyData.id,
          companyCode: notifyData.companyCode,
          companyName: notifyData.companyName,
          customerName: notifyData.customerName,
          source: notifyData.source,
          amount: notifyData.amount,
          vatAmount: notifyData.vatAmount,
          isWhtDeducted: notifyData.isWhtDeducted,
          whtRate: notifyData.whtRate,
          whtAmount: notifyData.whtAmount,
          netReceived: notifyData.netReceived,
          status: notifyData.status,
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
