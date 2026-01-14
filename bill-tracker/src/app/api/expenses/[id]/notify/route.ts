/**
 * POST /api/expenses/[id]/notify
 * Send LINE notification for an expense
 */

import { createNotifyHandler, expenseNotifyConfig } from "@/lib/api/notify-routes";

export const POST = createNotifyHandler(expenseNotifyConfig);
