import { Send, CheckCircle, PackageCheck } from "lucide-react";
import type { ActionConfig } from "./types";

/**
 * Workflow actions mapped to macro statuses.
 * ACTIVE status checklist items are handled by the DocumentChecklist component.
 * The CTA to advance from ACTIVE → READY_FOR_ACCOUNTING is defined here.
 * Actions are the same for both expense and income.
 */

export const WORKFLOW_ACTIONS: Record<string, ActionConfig[]> = {
  ACTIVE: [
    { action: "mark_ready_for_accounting", label: "พร้อมส่งบัญชี", icon: <PackageCheck className="h-4 w-4" />, description: "เอกสารครบ พร้อมส่งบัญชี" },
  ],
  READY_FOR_ACCOUNTING: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  SENT_TO_ACCOUNTANT: [
    { action: "complete", label: "เสร็จสิ้น", icon: <CheckCircle className="h-4 w-4" />, description: "ดำเนินการเสร็จสิ้น" },
  ],
};

export function buildFilteredActions(status: string): ActionConfig[] {
  return WORKFLOW_ACTIONS[status] || [];
}
