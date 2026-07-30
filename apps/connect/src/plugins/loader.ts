import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parsePluginManifest, SUPPORTED_PLUGIN_API_VERSION } from "@streamdesk/plugin-manifest";
import type { ConnectPluginModule } from "@streamdesk/connect-sdk";
import type { ConnectConfig } from "../config.js";
import type { Logger } from "../logging/logger.js";
import type { ConnectClient } from "../ws/client.js";
import type { CapabilityRegistry } from "../core/capability-registry.js";
import type { ActionHandlerRegistry } from "../core/action-handlers.js";
import { createConnectPluginContext } from "./context-factory.js";

/**
 * Mirrors the Server's plugin loader (apps/server/src/plugins/loader.ts):
 * scans `pluginsDir` for manifests, and activates the `components.connect`
 * entrypoint of every enabled plugin whose declared platforms/architectures
 * (if any) include this machine's.
 */
export async function loadConnectPlugins(
  config: ConnectConfig,
  client: ConnectClient,
  capabilities: CapabilityRegistry,
  actionHandlers: ActionHandlerRegistry,
  logger: Logger,
): Promise<string[]> {
  const { pluginsDir } = config;
  if (!existsSync(pluginsDir)) {
    logger.warn("Plugins directory does not exist, skipping plugin load", { pluginsDir });
    return [];
  }

  const loaded: string[] = [];
  const entries = readdirSync(pluginsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  for (const entry of entries) {
    const directory = resolve(pluginsDir, entry.name);
    const manifestPath = join(directory, "plugin.json");
    if (!existsSync(manifestPath)) continue;

    let manifestRaw: unknown;
    try {
      manifestRaw = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (error) {
      logger.error("Failed to parse plugin.json", { directory, error: String(error) });
      continue;
    }

    const result = parsePluginManifest(manifestRaw);
    if (!result.ok) {
      logger.error("Plugin manifest failed validation", { directory, errors: result.errors });
      continue;
    }

    const manifest = result.manifest;
    if (manifest.apiVersion !== SUPPORTED_PLUGIN_API_VERSION) continue;

    const connectComponent = manifest.components.connect;
    if (!connectComponent) continue;

    if (connectComponent.platforms && !connectComponent.platforms.includes(config.platform)) {
      logger.info("Skipping plugin: unsupported platform", { pluginId: manifest.id, platform: config.platform });
      continue;
    }
    if (connectComponent.architectures && !connectComponent.architectures.includes(config.architecture)) {
      logger.info("Skipping plugin: unsupported architecture", { pluginId: manifest.id, architecture: config.architecture });
      continue;
    }

    try {
      const entrypointPath = resolve(directory, connectComponent.entrypoint);
      const imported = (await import(pathToFileURL(entrypointPath).href)) as {
        default?: ConnectPluginModule;
      } & ConnectPluginModule;
      const pluginModule = imported.default ?? imported;

      if (typeof pluginModule.activate !== "function") {
        throw new Error("Plugin connect module has no activate() export");
      }

      const context = createConnectPluginContext(
        config,
        client,
        capabilities,
        actionHandlers,
        logger,
        manifest.id,
        manifest.version,
      );
      await pluginModule.activate(context);
      loaded.push(manifest.id);
      logger.info("Activated connect plugin", { pluginId: manifest.id, version: manifest.version });
    } catch (error) {
      logger.error("Failed to activate connect plugin", {
        pluginId: manifest.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return loaded;
}
