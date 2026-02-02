/**
 * Plugin System Types (Phase 8.1)
 * Defines interfaces for the extensible plugin architecture
 */

import type { Prisma } from "@prisma/client";

// =============================================================================
// Plugin Interfaces
// =============================================================================

/**
 * Custom field definition for plugins
 */
export interface CustomFieldDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "select" | "text";
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: unknown) => boolean | string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
}

/**
 * Transaction data interface (simplified)
 */
export interface TransactionData {
  id?: string;
  companyId: string;
  amount: number;
  [key: string]: unknown;
}

/**
 * Main plugin interface
 */
export interface ITransactionPlugin {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;

  /** Custom fields added by this plugin */
  customFields?: CustomFieldDefinition[];

  // Lifecycle hooks

  /**
   * Called before transaction creation
   * Can modify data or throw error to prevent creation
   */
  beforeCreate?(data: TransactionData): Promise<TransactionData>;

  /**
   * Called after transaction creation
   * For side effects like notifications, integrations, etc.
   */
  afterCreate?(transaction: TransactionData): Promise<void>;

  /**
   * Called before transaction update
   * Can modify updates or throw error to prevent update
   */
  beforeUpdate?(
    existing: TransactionData,
    updates: Partial<TransactionData>
  ): Promise<Partial<TransactionData>>;

  /**
   * Called after transaction update
   * For side effects
   */
  afterUpdate?(transaction: TransactionData): Promise<void>;

  /**
   * Called before transaction deletion
   * Can throw error to prevent deletion
   */
  beforeDelete?(transaction: TransactionData): Promise<void>;

  /**
   * Called after transaction deletion
   * For cleanup
   */
  afterDelete?(transactionId: string): Promise<void>;

  /**
   * Custom validation logic
   * Return true or error message string
   */
  validate?(data: TransactionData): ValidationResult | Promise<ValidationResult>;

  /**
   * Called on plugin initialization
   */
  onInit?(): Promise<void>;

  /**
   * Called on plugin cleanup
   */
  onDestroy?(): Promise<void>;
}

/**
 * Plugin constructor type
 */
export type PluginConstructor = new () => ITransactionPlugin;

/**
 * Plugin hook context
 */
export interface PluginContext {
  userId: string;
  companyId: string;
  transactionType: "expense" | "income";
}

/**
 * Plugin execution result
 */
export interface PluginExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pluginId?: string;
}
