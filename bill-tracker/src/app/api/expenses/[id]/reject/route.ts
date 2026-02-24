/**
 * POST /api/expenses/[id]/reject
 * Reject an expense that is pending approval
 */

import { createTransactionRejectHandler } from "@/lib/api/transaction-approval";

export const POST = createTransactionRejectHandler("expense");
