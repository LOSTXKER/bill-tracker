/**
 * POST /api/reimbursement-requests/[id]/approve
 * อนุมัติคำขอเบิกจ่าย
 */

import { createApproveHandler } from "@/lib/api/approval-routes";
import { reimbursementApprovalConfig } from "@/lib/api/configs/reimbursement-config";

export const POST = createApproveHandler(reimbursementApprovalConfig);
