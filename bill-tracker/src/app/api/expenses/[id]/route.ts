import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { expenseRouteConfig } from "@/lib/api/configs/expense-config";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Create expense routes using the shared config
const expenseRoutes = createTransactionRoutes(expenseRouteConfig);

export const GET = expenseRoutes.get;
export const PUT = expenseRoutes.update;
export const DELETE = expenseRoutes.delete;
