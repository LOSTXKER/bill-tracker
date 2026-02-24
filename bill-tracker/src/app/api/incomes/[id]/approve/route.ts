/**
 * POST /api/incomes/[id]/approve
 * Approve an income that is pending approval
 */

import { createTransactionApproveHandler } from "@/lib/api/transaction-approval";

export const POST = createTransactionApproveHandler("income");
