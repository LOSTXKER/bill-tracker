/**
 * usePayers Hook
 * 
 * Manages payer information for expense transactions.
 * Supports multiple payers with different payment types (company, user, petty cash).
 */

import { useState, useCallback, useEffect } from "react";

// =============================================================================
// Types
// =============================================================================

export type PaidByType = "COMPANY" | "USER" | "PETTY_CASH";

export interface PayerInfo {
  paidByType: PaidByType;
  paidByUserId: string | null;
  paidByName: string | null;
  amount: number;
  settlementStatus?: "PENDING" | "SETTLED";
  settledAt?: string;
  settlementRef?: string | null;
}

interface UsePayersOptions {
  /** Initial payers list */
  initialPayers?: PayerInfo[];
  /** Total transaction amount for validation */
  totalAmount?: number;
  /** Called when payers change */
  onPayersChange?: (payers: PayerInfo[]) => void;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_PAYER: PayerInfo = {
  paidByType: "COMPANY",
  paidByUserId: null,
  paidByName: null,
  amount: 0,
};

// =============================================================================
// Hook
// =============================================================================

export function usePayers({
  initialPayers = [],
  totalAmount = 0,
  onPayersChange,
}: UsePayersOptions = {}) {
  const [payers, setPayers] = useState<PayerInfo[]>(initialPayers);
  const [initialized, setInitialized] = useState(false);

  // Initialize payers on first load
  useEffect(() => {
    if (!initialized && initialPayers.length > 0) {
      setPayers(initialPayers);
      setInitialized(true);
    }
  }, [initialized, initialPayers]);

  // Notify parent when payers change
  useEffect(() => {
    if (initialized) {
      onPayersChange?.(payers);
    }
  }, [payers, initialized, onPayersChange]);

  /**
   * Add a new payer
   */
  const addPayer = useCallback((payer: Partial<PayerInfo> = {}) => {
    const newPayer: PayerInfo = {
      ...DEFAULT_PAYER,
      ...payer,
    };
    setPayers((prev) => [...prev, newPayer]);
  }, []);

  /**
   * Update a payer at a specific index
   */
  const updatePayer = useCallback((index: number, updates: Partial<PayerInfo>) => {
    setPayers((prev) =>
      prev.map((payer, i) =>
        i === index ? { ...payer, ...updates } : payer
      )
    );
  }, []);

  /**
   * Remove a payer at a specific index
   */
  const removePayer = useCallback((index: number) => {
    setPayers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Clear all payers
   */
  const clearPayers = useCallback(() => {
    setPayers([]);
  }, []);

  /**
   * Set all payers at once
   */
  const setAllPayers = useCallback((newPayers: PayerInfo[]) => {
    setPayers(newPayers);
    setInitialized(true);
  }, []);

  /**
   * Initialize from reimbursement data
   */
  const initializeFromReimbursement = useCallback(
    (
      requesterInfo?: { id?: string; name?: string },
      settlementInfo?: { settledAt?: string; settlementRef?: string },
      amount?: number
    ) => {
      if (!requesterInfo?.id && !requesterInfo?.name) return;

      const payer: PayerInfo = {
        paidByType: "USER",
        paidByUserId: requesterInfo.id || null,
        paidByName: requesterInfo.name || null,
        amount: amount || 0,
        ...(settlementInfo?.settledAt
          ? {
              settlementStatus: "SETTLED" as const,
              settledAt: settlementInfo.settledAt,
              settlementRef: settlementInfo.settlementRef || null,
            }
          : {}),
      };

      setPayers([payer]);
      setInitialized(true);
    },
    []
  );

  // =============================================================================
  // Computed Values
  // =============================================================================

  /**
   * Total amount paid by all payers
   */
  const totalPaid = payers.reduce((sum, payer) => sum + payer.amount, 0);

  /**
   * Remaining amount to be paid
   */
  const remainingAmount = totalAmount - totalPaid;

  /**
   * Check if payers are valid (total matches transaction amount)
   */
  const isValid = payers.length === 0 || Math.abs(remainingAmount) < 0.01;

  /**
   * Check if any payer is a user (for settlement tracking)
   */
  const hasUserPayer = payers.some((p) => p.paidByType === "USER");

  /**
   * Check if all user payers are settled
   */
  const allUserPayersSettled = payers
    .filter((p) => p.paidByType === "USER")
    .every((p) => p.settlementStatus === "SETTLED");

  /**
   * Get pending settlement amount
   */
  const pendingSettlementAmount = payers
    .filter((p) => p.paidByType === "USER" && p.settlementStatus !== "SETTLED")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    // State
    payers,
    initialized,

    // Actions
    addPayer,
    updatePayer,
    removePayer,
    clearPayers,
    setAllPayers,
    initializeFromReimbursement,

    // Computed
    totalPaid,
    remainingAmount,
    isValid,
    hasUserPayer,
    allUserPayersSettled,
    pendingSettlementAmount,
  };
}

export type UsePayersReturn = ReturnType<typeof usePayers>;
