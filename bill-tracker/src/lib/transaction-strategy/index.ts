/**
 * Transaction Strategy Pattern - Main Export
 * 
 * Central export point for transaction strategies.
 * Automatically registers all strategies on import.
 */

// Base classes and types
export {
  BaseTransactionStrategy,
  transactionRegistry,
  getTransactionStrategy,
  type ITransactionStrategy,
  type TransactionType,
  type TransactionFieldMapping,
  type TransactionPermissions,
  type TransactionLabels,
  type WorkflowStatus,
  type ValidationResult,
} from "./base";

// Concrete implementations
export { ExpenseStrategy, expenseStrategy } from "./expense-strategy";
export { IncomeStrategy, incomeStrategy } from "./income-strategy";

// Register all strategies
import { transactionRegistry, getTransactionStrategy as getStrategy } from "./base";
import { expenseStrategy } from "./expense-strategy";
import { incomeStrategy } from "./income-strategy";

// Auto-register on import
transactionRegistry.register(expenseStrategy);
transactionRegistry.register(incomeStrategy);

// Helper functions

/**
 * Get all registered transaction types
 */
export function getAllTransactionTypes() {
  return transactionRegistry.getAllTypes();
}

/**
 * Get all registered strategies
 */
export function getAllStrategies() {
  return transactionRegistry.getAll();
}

/**
 * Check if a transaction type is supported
 */
export function isTransactionTypeSupported(type: string): boolean {
  return transactionRegistry.has(type as any);
}

/**
 * Get labels for a transaction type
 */
export function getTransactionLabels(type: string) {
  const strategy = getStrategy(type as any);
  return strategy.labels;
}

/**
 * Get permissions for a transaction type
 */
export function getTransactionPermissions(type: string) {
  const strategy = getStrategy(type as any);
  return strategy.permissions;
}

/**
 * Get field mappings for a transaction type
 */
export function getTransactionFields(type: string) {
  const strategy = getStrategy(type as any);
  return strategy.fields;
}

/**
 * Validate create data using strategy
 */
export function validateTransactionCreate(type: string, data: Record<string, unknown>) {
  const strategy = getStrategy(type as any);
  return strategy.validateCreate(data);
}

/**
 * Validate update data using strategy
 */
export function validateTransactionUpdate(
  type: string,
  existingData: Record<string, unknown>,
  updates: Record<string, unknown>
) {
  const strategy = getStrategy(type as any);
  return strategy.validateUpdate(existingData, updates);
}

/**
 * Calculate transaction totals using strategy
 */
export function calculateTransactionTotals(
  type: string,
  amount: number,
  vatRate: number,
  whtRate: number
) {
  const strategy = getStrategy(type as any);
  return strategy.calculateTotals(amount, vatRate, whtRate);
}
