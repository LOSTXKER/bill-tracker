/**
 * Plugin Lifecycle Hooks (Phase 8.3)
 * Execute plugin hooks at appropriate lifecycle points
 */

import { pluginRegistry } from "./registry";
import {
  TransactionData,
  PluginContext,
  PluginExecutionResult,
  ValidationResult,
} from "./types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("plugin-hooks");

/**
 * Execute beforeCreate hooks for all enabled plugins
 */
export async function executeBeforeCreate(
  data: TransactionData,
  context: PluginContext
): Promise<TransactionData> {
  const plugins = pluginRegistry.getEnabled();
  let modifiedData = { ...data };

  for (const plugin of plugins) {
    if (plugin.beforeCreate) {
      try {
        modifiedData = await plugin.beforeCreate(modifiedData);
        log.debug(`Plugin ${plugin.metadata.id} modified data in beforeCreate`);
      } catch (error) {
        log.error(`Plugin ${plugin.metadata.id} beforeCreate failed:`, error);
        throw new Error(`Plugin ${plugin.metadata.name} prevented creation: ${error}`);
      }
    }
  }

  return modifiedData;
}

/**
 * Execute afterCreate hooks for all enabled plugins
 */
export async function executeAfterCreate(
  transaction: TransactionData,
  context: PluginContext
): Promise<void> {
  const plugins = pluginRegistry.getEnabled();

  // Execute in parallel (non-blocking)
  const promises = plugins.map(async (plugin) => {
    if (plugin.afterCreate) {
      try {
        await plugin.afterCreate(transaction);
        log.debug(`Plugin ${plugin.metadata.id} executed afterCreate`);
      } catch (error) {
        // Log but don't throw - afterCreate is non-blocking
        log.error(`Plugin ${plugin.metadata.id} afterCreate failed:`, error);
      }
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Execute beforeUpdate hooks for all enabled plugins
 */
export async function executeBeforeUpdate(
  existing: TransactionData,
  updates: Partial<TransactionData>,
  context: PluginContext
): Promise<Partial<TransactionData>> {
  const plugins = pluginRegistry.getEnabled();
  let modifiedUpdates = { ...updates };

  for (const plugin of plugins) {
    if (plugin.beforeUpdate) {
      try {
        modifiedUpdates = await plugin.beforeUpdate(existing, modifiedUpdates);
        log.debug(`Plugin ${plugin.metadata.id} modified updates in beforeUpdate`);
      } catch (error) {
        log.error(`Plugin ${plugin.metadata.id} beforeUpdate failed:`, error);
        throw new Error(`Plugin ${plugin.metadata.name} prevented update: ${error}`);
      }
    }
  }

  return modifiedUpdates;
}

/**
 * Execute afterUpdate hooks for all enabled plugins
 */
export async function executeAfterUpdate(
  transaction: TransactionData,
  context: PluginContext
): Promise<void> {
  const plugins = pluginRegistry.getEnabled();

  const promises = plugins.map(async (plugin) => {
    if (plugin.afterUpdate) {
      try {
        await plugin.afterUpdate(transaction);
        log.debug(`Plugin ${plugin.metadata.id} executed afterUpdate`);
      } catch (error) {
        log.error(`Plugin ${plugin.metadata.id} afterUpdate failed:`, error);
      }
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Execute beforeDelete hooks for all enabled plugins
 */
export async function executeBeforeDelete(
  transaction: TransactionData,
  context: PluginContext
): Promise<void> {
  const plugins = pluginRegistry.getEnabled();

  for (const plugin of plugins) {
    if (plugin.beforeDelete) {
      try {
        await plugin.beforeDelete(transaction);
        log.debug(`Plugin ${plugin.metadata.id} executed beforeDelete`);
      } catch (error) {
        log.error(`Plugin ${plugin.metadata.id} beforeDelete failed:`, error);
        throw new Error(`Plugin ${plugin.metadata.name} prevented deletion: ${error}`);
      }
    }
  }
}

/**
 * Execute afterDelete hooks for all enabled plugins
 */
export async function executeAfterDelete(
  transactionId: string,
  context: PluginContext
): Promise<void> {
  const plugins = pluginRegistry.getEnabled();

  const promises = plugins.map(async (plugin) => {
    if (plugin.afterDelete) {
      try {
        await plugin.afterDelete(transactionId);
        log.debug(`Plugin ${plugin.metadata.id} executed afterDelete`);
      } catch (error) {
        log.error(`Plugin ${plugin.metadata.id} afterDelete failed:`, error);
      }
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Execute validation hooks for all enabled plugins
 */
export async function executeValidation(
  data: TransactionData,
  context: PluginContext
): Promise<ValidationResult> {
  const plugins = pluginRegistry.getEnabled();
  const errors: string[] = [];

  for (const plugin of plugins) {
    if (plugin.validate) {
      try {
        const result = await plugin.validate(data);
        if (!result.valid) {
          errors.push(...result.errors.map((e) => `[${plugin.metadata.name}] ${e}`));
        }
      } catch (error) {
        log.error(`Plugin ${plugin.metadata.id} validation failed:`, error);
        errors.push(`[${plugin.metadata.name}] Validation error`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
