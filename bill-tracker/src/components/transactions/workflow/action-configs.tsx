import { Send, CheckCircle } from "lucide-react";
import type { ActionConfig } from "./types";

/**
 * Workflow actions mapped to macro statuses.
 * ACTIVE status actions (document checklist items) are handled by the
 * DocumentChecklist component, not here.
 * Actions are the same for both expense and income.
 */

export const WORKFLOW_ACTIONS: Record<string, ActionConfig[]> = {
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
