/**
 * POST /api/incomes/[id]/reject
 * Reject an income that is pending approval
 */

import { createTransactionRejectHandler } from "@/lib/api/transaction-approval";

export const POST = createTransactionRejectHandler("income");
