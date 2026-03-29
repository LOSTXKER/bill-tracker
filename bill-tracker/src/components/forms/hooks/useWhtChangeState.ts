"use client";

import { useMemo, useCallback } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { WHT_LOCKED_STATUSES, WHT_CONFIRM_STATUSES_ALL } from "@/lib/constants/transaction";
import type { BaseTransaction } from "./transaction-form-types";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";

interface UseWhtChangeStateProps {
  transaction: BaseTransaction | null;
  mode: "create" | "view" | "edit";
  config: UnifiedTransactionConfig;
  setValue: UseFormSetValue<Record<string, unknown>>;
}

export function useWhtChangeState({ transaction, mode, config, setValue }: UseWhtChangeStateProps) {
  const whtChangeInfo = useMemo(() => {
    if (!transaction || mode !== "edit") return undefined;

    const currentStatus = transaction.workflowStatus || "";
    const hasWhtCert = transaction.hasWhtCert || false;
    const currentWht = config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted;

    if (WHT_LOCKED_STATUSES.includes(currentStatus as (typeof WHT_LOCKED_STATUSES)[number])) {
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
  }, [transaction, mode, config.type]);

  const handleWhtToggle = useCallback(
    (enabled: boolean, confirmed?: boolean, reason?: string) => {
      setValue(config.fields.whtField.name as string, enabled);
      if (!enabled) {
        setValue("whtRate", undefined);
        setValue("whtType", undefined);
      }
      if (confirmed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue("_whtChangeConfirmed" as any, true);
        if (reason) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setValue("_whtChangeReason" as any, reason);
        }
      }
    },
    [setValue, config.fields.whtField.name]
  );

  return { whtChangeInfo, handleWhtToggle };
}
