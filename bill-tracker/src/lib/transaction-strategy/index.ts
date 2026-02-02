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
  isValidTransactionType,
  VALID_TRANSACTION_TYPES,
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
import { transactionRegistry, getTransactionStrategy as getStrategy, isValidTransactionType } from "./base";
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
  return isValidTransactionType(type) && transactionRegistry.has(type);
}

/**
 * Get labels for a transaction type
 * @throws Error if type is invalid
 */
export function getTransactionLabels(type: string) {
  if (!isValidTransactionType(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  const strategy = getStrategy(type);
  return strategy.labels;
}

/**
 * Get permissions for a transaction type
 * @throws Error if type is invalid
 */
export function getTransactionPermissions(type: string) {
  if (!isValidTransactionType(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  const strategy = getStrategy(type);
  return strategy.permissions;
}

/**
 * Get field mappings for a transaction type
 * @throws Error if type is invalid
 */
export function getTransactionFields(type: string) {
  if (!isValidTransactionType(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  const strategy = getStrategy(type);
  return strategy.fields;
}

/**
 * Validate create data using strategy
 * @throws Error if type is invalid
 */
export function validateTransactionCreate(type: string, data: Record<string, unknown>) {
  if (!isValidTransactionType(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  const strategy = getStrategy(type);
  return strategy.validateCreate(data);
}

/**
 * Validate update data using strategy
 * @throws Error if type is invalid
 */
export function validateTransactionUpdate(
  type: string,
  existingData: Record<string, unknown>,
  updates: Record<string, unknown>
) {
  if (!isValidTransactionType(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  const strategy = getStrategy(type);
  return strategy.validateUpdate(existingData, updates);
}

/**
 * Calculate transaction totals using strategy
 * @throws Error if type is invalid
 */
export function calculateTransactionTotals(
  type: string,
  amount: number,
  vatRate: number,
  whtRate: number
) {
  if (!isValidTransactionType(type)) {
    throw new Error(`Invalid transaction type: ${type}`);
  }
  const strategy = getStrategy(type);
  return strategy.calculateTotals(amount, vatRate, whtRate);
}
