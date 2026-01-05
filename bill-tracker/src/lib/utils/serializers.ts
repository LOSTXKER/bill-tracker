import type { Expense, Income, Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

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
 * Type helper to convert Decimal fields to number
 */
type SerializedDecimal<T> = T extends Decimal ? number : T;

/**
 * Serialized expense type with Decimal converted to number
 */
export type SerializedExpense<T extends Expense = Expense> = {
  [K in keyof T]: K extends 'amount' | 'vatAmount' | 'whtRate' | 'whtAmount' | 'netPaid' 
    ? T[K] extends Decimal ? number : T[K] extends Decimal | null ? number | null : T[K]
    : T[K];
};

/**
 * Serialized income type with Decimal converted to number
 */
export type SerializedIncome<T extends Income = Income> = {
  [K in keyof T]: K extends 'amount' | 'vatAmount' | 'whtRate' | 'whtAmount' | 'netReceived' 
    ? T[K] extends Decimal ? number : T[K] extends Decimal | null ? number | null : T[K]
    : T[K];
};

/**
 * Generic transaction serializer
 * Converts Decimal fields to numbers based on provided field list
 */
export function serializeTransaction<T extends Record<string, any>>(
  transaction: T,
  decimalFields: (keyof T)[]
): T {
  const serialized = { ...transaction } as T;
  
  decimalFields.forEach((field) => {
    if (field in serialized) {
      (serialized[field] as any) = serializeDecimal(serialized[field]);
    }
  });
  
  return serialized;
}

/**
 * Serialize expense data for client components
 * Converts all Decimal fields to numbers
 */
export function serializeExpense<T extends Expense>(expense: T): SerializedExpense<T> {
  return serializeTransaction(expense, [
    'amount',
    'vatAmount',
    'whtRate',
    'whtAmount',
    'netPaid',
  ] as (keyof T)[]) as SerializedExpense<T>;
}

/**
 * Serialize income data for client components
 * Converts all Decimal fields to numbers
 */
export function serializeIncome<T extends Income>(income: T): SerializedIncome<T> {
  return serializeTransaction(income, [
    'amount',
    'vatAmount',
    'whtRate',
    'whtAmount',
    'netReceived',
  ] as (keyof T)[]) as SerializedIncome<T>;
}

/**
 * Serialize an array of expenses
 */
export function serializeExpenses<T extends Expense>(expenses: T[]): SerializedExpense<T>[] {
  return expenses.map(serializeExpense);
}

/**
 * Serialize an array of incomes
 */
export function serializeIncomes<T extends Income>(incomes: T[]): SerializedIncome<T>[] {
  return incomes.map(serializeIncome);
}

/**
 * Generic array serializer
 */
export function serializeTransactions<T extends Record<string, any>>(
  transactions: T[],
  decimalFields: (keyof T)[]
): T[] {
  return transactions.map((t) => serializeTransaction(t, decimalFields));
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
