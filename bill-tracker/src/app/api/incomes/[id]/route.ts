import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { incomeRouteConfig } from "@/lib/api/configs/income-config";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Create income routes using the shared config
const incomeRoutes = createTransactionRoutes(incomeRouteConfig);

export const GET = incomeRoutes.get;
export const PUT = incomeRoutes.update;
export const DELETE = incomeRoutes.delete;
