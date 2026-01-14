/**
 * POST /api/incomes/[id]/notify
 * Send LINE notification for an income
 */

import { createNotifyHandler, incomeNotifyConfig } from "@/lib/api/notify-routes";

export const POST = createNotifyHandler(incomeNotifyConfig);
