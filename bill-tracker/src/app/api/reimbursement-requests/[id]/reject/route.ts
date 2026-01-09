/**
 * POST /api/reimbursement-requests/[id]/reject
 * ปฏิเสธคำขอเบิกจ่าย
 */

import { createRejectHandler } from "@/lib/api/approval-routes";
import { reimbursementApprovalConfig } from "@/lib/api/configs/reimbursement-config";

export const POST = createRejectHandler(reimbursementApprovalConfig);
