import type { Expense, Income, Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

/**
 * Convert Prisma Decimal to number (or null).
 * Prefer `toNumber()` for non-nullable conversions; this is kept for nullable fields.
 */
export function serializeDecimal(value: Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  // Use toNumber path when the value has .toNumber() (Prisma Decimal)
  if (typeof value === "object" && "toNumber" in value && typeof (value as { toNumber?: unknown }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
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
export function serializeTransaction<T extends object>(
  transaction: T,
  decimalFields: (keyof T)[]
): T {
  const serialized = { ...transaction } as Record<string, unknown>;
  
  decimalFields.forEach((field) => {
    const key = field as string;
    if (key in serialized) {
      serialized[key] = serializeDecimal(serialized[key] as Decimal | number | string | null | undefined);
    }
  });
  
  return serialized as T;
}

/**
 * Serialize contact data for client components
 * Converts Decimal fields to numbers
 */
export function serializeContact<T extends object>(contact: T | null | undefined): T | null {
  if (!contact) return null;
  
  const serialized = { ...contact } as Record<string, unknown>;
  
  const contactDecimalFields = ['defaultWhtRate', 'defaultVatRate', 'creditLimit'];
  contactDecimalFields.forEach((field) => {
    if (field in serialized) {
      serialized[field] = serializeDecimal(serialized[field] as Decimal | number | string | null | undefined);
    }
  });
  
  return serialized as T;
}

/**
 * Serialize expense data for client components
 * Converts all Decimal fields to numbers, including nested relations
 */
export function serializeExpense<T extends Expense>(expense: T): SerializedExpense<T> {
  const serialized = serializeTransaction(expense, [
    'amount',
    'vatAmount',
    'whtRate',
    'whtAmount',
    'netPaid',
    'originalAmount',
    'exchangeRate',
  ] as (keyof T)[]) as SerializedExpense<T>;
  
  if ('contact' in serialized && serialized.contact) {
    (serialized as Record<string, unknown>).contact = serializeContact(serialized.contact as Record<string, unknown>);
  }
  if ('Contact' in serialized && serialized.Contact) {
    (serialized as Record<string, unknown>).Contact = serializeContact(serialized.Contact as Record<string, unknown>);
  }
  
  return serialized;
}

/**
 * Serialize income data for client components
 * Converts all Decimal fields to numbers, including nested relations
 */
export function serializeIncome<T extends Income>(income: T): SerializedIncome<T> {
  const serialized = serializeTransaction(income, [
    'amount',
    'vatAmount',
    'whtRate',
    'whtAmount',
    'netReceived',
    'originalAmount',
    'exchangeRate',
  ] as (keyof T)[]) as SerializedIncome<T>;
  
  if ('contact' in serialized && serialized.contact) {
    (serialized as Record<string, unknown>).contact = serializeContact(serialized.contact as Record<string, unknown>);
  }
  if ('Contact' in serialized && serialized.Contact) {
    (serialized as Record<string, unknown>).Contact = serializeContact(serialized.Contact as Record<string, unknown>);
  }
  
  return serialized;
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
export function serializeTransactions<T extends object>(
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
