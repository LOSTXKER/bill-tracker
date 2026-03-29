/**
 * Shared Income Route Configuration
 * Used by both /api/incomes and /api/incomes/[id] routes
 */

import { prisma } from "@/lib/db";
import type { Income } from "@prisma/client";
import type { TransactionRouteConfig } from "../transaction-routes";
import { transformIncomeCreateData, transformIncomeUpdateData } from "./income-transforms";
import { handleIncomeAfterCreate } from "./income-hooks";
import { notifyIncomeCreate, getIncomeDisplayName } from "./income-notifications";

// Re-export WHT types and validator for backward compatibility
export { validateIncomeWhtChange } from "@/lib/validations/wht-validator";
export type { WhtChangeValidation } from "@/lib/validations/wht-validator";

export const incomeRouteConfig: Omit<TransactionRouteConfig<Income, Record<string, unknown>, Record<string, unknown>>, "prismaModel"> & {
  prismaModel: typeof prisma.income;
} = {
  modelName: "income",
  displayName: "Income",
  prismaModel: prisma.income,

  permissions: {
    read: "incomes:read",
    create: "incomes:create",
    update: "incomes:update",
    delete: "incomes:delete",
  },

  fields: {
    dateField: "receiveDate",
    netAmountField: "netReceived",
    statusField: "status",
  },

  transformCreateData: transformIncomeCreateData,
  transformUpdateData: transformIncomeUpdateData,
  afterCreate: handleIncomeAfterCreate,
  notifyCreate: notifyIncomeCreate,
  getEntityDisplayName: getIncomeDisplayName,
};
