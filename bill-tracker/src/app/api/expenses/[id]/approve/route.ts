/**
 * POST /api/expenses/[id]/approve
 * Approve an expense that is pending approval
 */

import { createTransactionApproveHandler } from "@/lib/api/transaction-approval";

export const POST = createTransactionApproveHandler("expense");
