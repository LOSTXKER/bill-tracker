import { useMemo } from "react";
import {
  WHT_LOCKED_STATUSES,
  WHT_CONFIRM_STATUSES_ALL,
} from "@/lib/constants/transaction";

export interface UseWhtChangeRulesProps {
  transaction: {
    workflowStatus?: string;
    hasWhtCert?: boolean;
    isWht?: boolean;
    isWhtDeducted?: boolean;
  } | null;
  mode: string;
  transactionType: "expense" | "income";
}

export interface WhtChangeInfo {
  isLocked: boolean;
  requiresConfirmation: boolean;
  message: string;
}

/**
 * Determines whether WHT can be toggled on the current transaction and what
 * guard-rails apply (hard lock vs. soft confirmation).
 *
 * Returns `undefined` when in create mode or when there are no restrictions.
 */
export function useWhtChangeRules({
  transaction,
  mode,
  transactionType,
}: UseWhtChangeRulesProps): WhtChangeInfo | undefined {
  return useMemo(() => {
    if (!transaction || mode !== "edit") return undefined;

    const currentStatus = transaction.workflowStatus || "";
    const hasWhtCert = transaction.hasWhtCert || false;
    const currentWht =
      transactionType === "expense"
        ? transaction.isWht
        : transaction.isWhtDeducted;

    if (
      WHT_LOCKED_STATUSES.includes(
        currentStatus as (typeof WHT_LOCKED_STATUSES)[number]
      )
    ) {
      return {
        isLocked: true,
        requiresConfirmation: false,
        message: "ไม่สามารถเปลี่ยนได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว",
      };
    }

    if (
      WHT_CONFIRM_STATUSES_ALL.includes(
        currentStatus as (typeof WHT_CONFIRM_STATUSES_ALL)[number]
      ) ||
      hasWhtCert
    ) {
      return {
        isLocked: false,
        requiresConfirmation: true,
        message: currentWht
          ? "คุณกำลังจะยกเลิกหัก ณ ที่จ่าย สถานะจะถูกย้อนกลับและอาจต้อง void เอกสาร 50 ทวิ"
          : "คุณกำลังจะเพิ่มหัก ณ ที่จ่าย ต้องออกหนังสือรับรอง (50 ทวิ) ก่อนส่งบัญชี",
      };
    }

    return undefined;
  }, [transaction, mode, transactionType]);
}
