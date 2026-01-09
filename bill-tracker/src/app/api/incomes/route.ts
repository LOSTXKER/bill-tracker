import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { incomeRouteConfig } from "@/lib/api/configs/income-config";

// Create income routes using the shared config
const incomeRoutes = createTransactionRoutes(incomeRouteConfig);

export const GET = incomeRoutes.list;
export const POST = incomeRoutes.create;
