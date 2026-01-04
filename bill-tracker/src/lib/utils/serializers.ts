import type { Expense, Income } from "@prisma/client";

/**
 * Convert Prisma Decimal to number
 * @param value - The Decimal value to convert
 * @returns The number value or null
 */
export function serializeDecimal(value: any): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Serialize expense data for client components
 * Converts all Decimal fields to numbers
 */
export function serializeExpense<T extends Expense>(expense: T) {
  return {
    ...expense,
    amount: serializeDecimal(expense.amount),
    vatRate: expense.vatRate,
    vatAmount: serializeDecimal(expense.vatAmount),
    whtRate: serializeDecimal(expense.whtRate),
    whtAmount: serializeDecimal(expense.whtAmount),
    netPaid: serializeDecimal(expense.netPaid),
  };
}

/**
 * Serialize income data for client components
 * Converts all Decimal fields to numbers
 */
export function serializeIncome<T extends Income>(income: T) {
  return {
    ...income,
    amount: serializeDecimal(income.amount),
    vatRate: income.vatRate,
    vatAmount: serializeDecimal(income.vatAmount),
    whtRate: serializeDecimal(income.whtRate),
    whtAmount: serializeDecimal(income.whtAmount),
    netReceived: serializeDecimal(income.netReceived),
  };
}

/**
 * Serialize an array of expenses
 */
export function serializeExpenses<T extends Expense>(expenses: T[]) {
  return expenses.map(serializeExpense);
}

/**
 * Serialize an array of incomes
 */
export function serializeIncomes<T extends Income>(incomes: T[]) {
  return incomes.map(serializeIncome);
}

/**
 * Convert Decimal-like value to number safely
 * Handles objects with toNumber method (from Prisma Decimal)
 */
export function toNumber(value: number | bigint | { toNumber?: () => number } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  
  return Number(value);
}
