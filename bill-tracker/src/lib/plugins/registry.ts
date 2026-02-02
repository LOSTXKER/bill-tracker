/**
 * Plugin Registry (Phase 8.2)
 * Manages plugin registration and lifecycle
 */

import { ITransactionPlugin, PluginMetadata } from "./types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("plugin-registry");

/**
 * Singleton registry for transaction plugins
 */
class PluginRegistry {
  private plugins: Map<string, ITransactionPlugin> = new Map();
  private initialized = false;

  /**
   * Register a plugin
   */
  register(plugin: ITransactionPlugin): void {
    const { id, enabled } = plugin.metadata;

    if (this.plugins.has(id)) {
      log.warn(`Plugin ${id} is already registered`);
      return;
    }

    if (!enabled) {
      log.info(`Plugin ${id} is disabled, skipping registration`);
      return;
    }

    this.plugins.set(id, plugin);
    log.info(`Registered plugin: ${id} (${plugin.metadata.name})`);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.onDestroy) {
      plugin.onDestroy().catch((error) => {
        log.error(`Error destroying plugin ${pluginId}:`, error);
      });
    }
    this.plugins.delete(pluginId);
    log.info(`Unregistered plugin: ${pluginId}`);
  }

  /**
   * Get a specific plugin
   */
  get(pluginId: string): ITransactionPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): ITransactionPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all enabled plugins
   */
  getEnabled(): ITransactionPlugin[] {
    return this.getAll().filter((p) => p.metadata.enabled);
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata[] {
    return this.getAll().map((p) => p.metadata);
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Initialize all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn("Plugins already initialized");
      return;
    }

    log.info("Initializing plugins...");
    const plugins = this.getEnabled();

    for (const plugin of plugins) {
      try {
        if (plugin.onInit) {
          await plugin.onInit();
          log.info(`Initialized plugin: ${plugin.metadata.id}`);
        }
      } catch (error) {
        log.error(`Failed to initialize plugin ${plugin.metadata.id}:`, error);
      }
    }

    this.initialized = true;
    log.info(`Initialized ${plugins.length} plugins`);
  }

  /**
   * Destroy all plugins
   */
  async destroy(): Promise<void> {
    log.info("Destroying plugins...");
    const plugins = this.getAll();

    for (const plugin of plugins) {
      try {
        if (plugin.onDestroy) {
          await plugin.onDestroy();
        }
      } catch (error) {
        log.error(`Failed to destroy plugin ${plugin.metadata.id}:`, error);
      }
    }

    this.plugins.clear();
    this.initialized = false;
    log.info("All plugins destroyed");
  }

  /**
   * Clear all plugins (for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
