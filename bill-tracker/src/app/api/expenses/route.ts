import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { expenseRouteConfig } from "@/lib/api/configs/expense-config";

// Create expense routes using the shared config
const expenseRoutes = createTransactionRoutes(expenseRouteConfig);

export const GET = expenseRoutes.list;
export const POST = expenseRoutes.create;
