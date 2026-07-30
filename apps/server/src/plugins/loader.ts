import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parsePluginManifest, SUPPORTED_PLUGIN_API_VERSION, type InstalledPlugin } from "@streamdesk/plugin-manifest";
import type { ServerPluginModule } from "@streamdesk/server-sdk";
import type { Runtime } from "../core/runtime.js";
import { createServerPluginContext } from "./context-factory.js";

export type LoadedServerPlugin = {
  pluginId: string;
  module: ServerPluginModule;
};

/**
 * Scans `pluginsDir` for subdirectories containing a `plugin.json`,
 * validates each manifest, records it in the `plugins` table, and — for
 * plugins that declare a `components.server` entrypoint and are enabled —
 * dynamically imports and activates it.
 *
 * V1 explicitly loads only from a local, operator-controlled directory.
 * There is no marketplace, no download step, and no code signing (see
 * ADR-010 / docs/architecture/security.md for the V1 trust model).
 */
export async function loadPlugins(runtime: Runtime): Promise<LoadedServerPlugin[]> {
  const { pluginsDir } = runtime.config;
  const logger = runtime.logger.child("server", "plugin-loader");

  if (!existsSync(pluginsDir)) {
    logger.warn("Plugins directory does not exist, skipping plugin load", { pluginsDir });
    return [];
  }

  const entries = readdirSync(pluginsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const loaded: LoadedServerPlugin[] = [];
  const now = new Date().toISOString();

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
    if (manifest.apiVersion !== SUPPORTED_PLUGIN_API_VERSION) {
      logger.error("Unsupported plugin apiVersion", {
        pluginId: manifest.id,
        apiVersion: manifest.apiVersion,
        supported: SUPPORTED_PLUGIN_API_VERSION,
      });
      continue;
    }

    const existing = runtime.repos.plugins.getById(manifest.id);
    const installedPlugin: InstalledPlugin = {
      manifest,
      directory,
      state: existing?.state ?? "enabled",
      installedAt: existing?.installedAt ?? now,
      updatedAt: now,
    };
    runtime.repos.plugins.upsert(installedPlugin);

    if (installedPlugin.state === "disabled") {
      logger.info("Plugin is disabled, skipping activation", { pluginId: manifest.id });
      continue;
    }

    if (!manifest.components.server) continue;

    try {
      const entrypointPath = resolve(directory, manifest.components.server.entrypoint);
      const imported = (await import(pathToFileURL(entrypointPath).href)) as {
        default?: ServerPluginModule;
      } & ServerPluginModule;
      const pluginModule: ServerPluginModule = imported.default ?? imported;

      if (typeof pluginModule.activate !== "function") {
        throw new Error("Plugin server module has no activate() export");
      }

      const context = createServerPluginContext(runtime, manifest.id, manifest.version);
      await pluginModule.activate(context);

      loaded.push({ pluginId: manifest.id, module: pluginModule });
      logger.info("Activated server plugin", { pluginId: manifest.id, version: manifest.version });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to activate server plugin", { pluginId: manifest.id, error: message });
      runtime.repos.plugins.setState(manifest.id, "error", message, new Date().toISOString());
    }
  }

  return loaded;
}
