/**
 * Plugin Loader (Phase 8.2)
 * Discovers and loads plugins from the plugins directory
 */

import { ITransactionPlugin } from "./types";
import { pluginRegistry } from "./registry";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("plugin-loader");

/**
 * Plugin loader for discovering and loading plugins
 * 
 * Future implementation will scan src/plugins/ directory
 * and dynamically import plugin modules
 */
export class PluginLoader {
  private loadedPlugins: Set<string> = new Set();

  /**
   * Load all plugins from the plugins directory
   * 
   * @example
   * ```ts
   * const loader = new PluginLoader();
   * await loader.loadAll();
   * ```
   */
  async loadAll(): Promise<void> {
    log.info("Loading plugins...");

    // Future implementation:
    // 1. Scan src/plugins/ directory
    // 2. Import each plugin module
    // 3. Validate plugin structure
    // 4. Register with pluginRegistry

    // For now, plugins must be manually registered
    log.info("Manual plugin registration required - automatic discovery not yet implemented");
  }

  /**
   * Load a specific plugin by path
   */
  async loadPlugin(pluginPath: string): Promise<ITransactionPlugin | null> {
    try {
      // Future implementation: dynamic import
      log.info(`Loading plugin from: ${pluginPath}`);
      return null;
    } catch (error) {
      log.error(`Failed to load plugin from ${pluginPath}:`, error);
      return null;
    }
  }

  /**
   * Reload a plugin (useful for development)
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    if (pluginRegistry.has(pluginId)) {
      pluginRegistry.unregister(pluginId);
    }
    // Re-load the plugin
    // Future implementation
  }

  /**
   * Validate plugin structure
   */
  validatePlugin(plugin: unknown): plugin is ITransactionPlugin {
    if (!plugin || typeof plugin !== "object") {
      return false;
    }

    const p = plugin as Partial<ITransactionPlugin>;

    // Check required metadata
    if (!p.metadata || typeof p.metadata !== "object") {
      return false;
    }

    const metadata = p.metadata;
    if (!metadata.id || !metadata.name || !metadata.version) {
      return false;
    }

    return true;
  }

  /**
   * Get list of loaded plugin IDs
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.loadedPlugins);
  }
}

// Export singleton instance
export const pluginLoader = new PluginLoader();
