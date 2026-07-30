import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PluginStorage } from "@streamdesk/shared-types";

/**
 * File-backed PluginStorage for Connect plugins (Connect has no SQLite
 * database of its own — it's meant to be a lightweight agent). One JSON
 * file per plugin under `<dataDir>/plugin-storage/<pluginId>.json`.
 */
export function createFilePluginStorage(dataDir: string, pluginId: string): PluginStorage {
  const dir = join(dataDir, "plugin-storage");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${pluginId}.json`);

  function readAll(): Record<string, unknown> {
    if (!existsSync(filePath)) return {};
    try {
      return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  function writeAll(data: Record<string, unknown>): void {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const data = readAll();
      return key in data ? (data[key] as T) : null;
    },
    async set(key: string, value: unknown): Promise<void> {
      const data = readAll();
      data[key] = value;
      writeAll(data);
    },
    async delete(key: string): Promise<void> {
      const data = readAll();
      delete data[key];
      writeAll(data);
    },
    async keys(): Promise<string[]> {
      return Object.keys(readAll());
    },
  };
}
