/**
 * Shared Expense Route Configuration
 * Used by both /api/expenses and /api/expenses/[id] routes
 */

import { prisma } from "@/lib/db";
import type { Expense } from "@prisma/client";
import type { TransactionRouteConfig } from "../transaction-routes";
import { transformExpenseCreateData, transformExpenseUpdateData } from "./expense-transforms";
import { handleExpenseAfterCreate, handleExpenseAfterUpdate } from "./expense-hooks";
import { notifyExpenseCreate, getExpenseDisplayName } from "./expense-notifications";

// Re-export WHT types and validator for backward compatibility
export { validateExpenseWhtChange as validateWhtChange } from "@/lib/validations/wht-validator";
export type { WhtChangeValidation } from "@/lib/validations/wht-validator";

export const expenseRouteConfig: Omit<TransactionRouteConfig<Expense, Record<string, unknown>, Record<string, unknown>>, "prismaModel"> & {
  prismaModel: typeof prisma.expense;
} = {
  modelName: "expense",
  displayName: "Expense",
  prismaModel: prisma.expense,

  permissions: {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
    delete: "expenses:delete",
  },

  fields: {
    dateField: "billDate",
    netAmountField: "netPaid",
    statusField: "status",
  },

  transformCreateData: transformExpenseCreateData,
  transformUpdateData: transformExpenseUpdateData,
  afterCreate: handleExpenseAfterCreate,
  afterUpdate: handleExpenseAfterUpdate,
  notifyCreate: notifyExpenseCreate,
  getEntityDisplayName: getExpenseDisplayName,
};
