/**
 * POST /api/reimbursement-requests/[id]/pay
 * บันทึกการจ่ายเงินคืน (ไม่สร้าง Expense อัตโนมัติ - ต้องกดสร้างเอง)
 */

import { createPayHandler } from "@/lib/api/approval-routes";
import { reimbursementPaymentConfig } from "@/lib/api/configs/reimbursement-config";

export const POST = createPayHandler(reimbursementPaymentConfig);
