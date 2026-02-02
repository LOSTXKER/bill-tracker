/**
 * useTransactionCalculation Hook
 * 
 * Manages transaction calculation state and auto-recalculation logic.
 * Extracted from UnifiedTransactionForm to reduce complexity.
 */

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// Types
// =============================================================================

export interface TransactionCalculation {
  baseAmount: number;
  vatAmount: number;
  whtAmount: number;
  totalWithVat: number;
  netAmount: number;
}

export type CalculationFunction = (
  amount: number,
  vatRate: number,
  whtRate: number
) => TransactionCalculation;

interface UseTransactionCalculationOptions {
  /** Function to calculate totals */
  calculateTotals: CalculationFunction;
  /** Initial calculation values */
  initialCalculation?: TransactionCalculation;
}

interface CalculationInputs {
  amount: number | string | null | undefined;
  vatRate: number | string | null | undefined;
  whtRate: number | string | null | undefined;
  isWhtEnabled: boolean;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_CALCULATION: TransactionCalculation = {
  baseAmount: 0,
  vatAmount: 0,
  whtAmount: 0,
  totalWithVat: 0,
  netAmount: 0,
};

// =============================================================================
// Hook
// =============================================================================

export function useTransactionCalculation({
  calculateTotals,
  initialCalculation = DEFAULT_CALCULATION,
}: UseTransactionCalculationOptions) {
  const [calculation, setCalculation] = useState<TransactionCalculation>(initialCalculation);

  /**
   * Recalculate totals based on inputs
   */
  const recalculate = useCallback(
    (inputs: CalculationInputs) => {
      const amount = Number(inputs.amount) || 0;
      const vatRate = Number(inputs.vatRate) || 0;
      const whtRate = inputs.isWhtEnabled ? Number(inputs.whtRate) || 0 : 0;

      const newCalculation = calculateTotals(amount, vatRate, whtRate);
      setCalculation(newCalculation);

      return newCalculation;
    },
    [calculateTotals]
  );

  /**
   * Reset calculation to initial/default values
   */
  const resetCalculation = useCallback(() => {
    setCalculation(initialCalculation);
  }, [initialCalculation]);

  /**
   * Set calculation directly (for loading existing data)
   */
  const setCalculationValues = useCallback((values: Partial<TransactionCalculation>) => {
    setCalculation((prev) => ({
      ...prev,
      ...values,
    }));
  }, []);

  return {
    calculation,
    recalculate,
    resetCalculation,
    setCalculation: setCalculationValues,
  };
}

// =============================================================================
// Helper: Create auto-recalculating hook
// =============================================================================

/**
 * Hook that auto-recalculates when form values change
 */
export function useAutoRecalculation(
  calculateTotals: CalculationFunction,
  watchedValues: {
    amount: number | string | null | undefined;
    vatRate: number | string | null | undefined;
    whtRate: number | string | null | undefined;
    isWhtEnabled: boolean;
  }
) {
  const { calculation, recalculate } = useTransactionCalculation({
    calculateTotals,
  });

  // Auto-recalculate when values change
  useEffect(() => {
    recalculate(watchedValues);
  }, [
    watchedValues.amount,
    watchedValues.vatRate,
    watchedValues.whtRate,
    watchedValues.isWhtEnabled,
    recalculate,
  ]);

  return calculation;
}

export type UseTransactionCalculationReturn = ReturnType<typeof useTransactionCalculation>;
