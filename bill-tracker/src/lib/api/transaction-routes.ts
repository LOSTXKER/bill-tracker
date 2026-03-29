export type {
  TransactionModelName,
  TransactionHookContext,
  TransactionUpdateHookContext,
  TransactionRequestBody,
  ExpenseDelegate,
  IncomeDelegate,
  TransactionDelegate,
  TransactionRecord,
  TransactionRouteConfig,
  RouteParamsContext,
} from "./transaction-types";

export { createListHandler } from "./transaction-query";
export { createCreateHandler, createGetHandler, createUpdateHandler, createDeleteHandler } from "./transaction-crud";

import { createListHandler } from "./transaction-query";
import { createCreateHandler, createGetHandler, createUpdateHandler, createDeleteHandler } from "./transaction-crud";
import type { TransactionRouteConfig } from "./transaction-types";

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
