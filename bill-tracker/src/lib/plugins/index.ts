/**
 * Plugin System - Main Export (Phase 8)
 * Central export point for the plugin system
 */

// Types
export type {
  ITransactionPlugin,
  PluginMetadata,
  CustomFieldDefinition,
  ValidationResult,
  TransactionData,
  PluginContext,
  PluginExecutionResult,
  PluginConstructor,
} from "./types";

// Registry
export { pluginRegistry } from "./registry";

// Loader
export { PluginLoader, pluginLoader } from "./loader";

// Lifecycle hooks
export {
  executeBeforeCreate,
  executeAfterCreate,
  executeBeforeUpdate,
  executeAfterUpdate,
  executeBeforeDelete,
  executeAfterDelete,
  executeValidation,
} from "./hooks";
