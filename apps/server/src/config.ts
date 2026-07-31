import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export type ServerConfig = {
  host: string;
  port: number;
  dataDir: string;
  dbPath: string;
  /** Uploaded custom icon images (see routes/icons.ts), served back at /api/icons/:assetId. */
  iconsDir: string;
  pluginsDir: string;
  logLevel: "debug" | "info" | "warn" | "error";
  /** Milliseconds to wait for a Connect to return an action result before timing out. */
  actionTimeoutMs: number;
  /** Milliseconds of silence before a socket is considered dead. */
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
  corsOrigin: string;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): ServerConfig {
  const dataDir = resolve(process.env.DATA_DIR ?? "./data");
  mkdirSync(dataDir, { recursive: true });

  const iconsDir = resolve(dataDir, "icons");
  mkdirSync(iconsDir, { recursive: true });

  const pluginsDir = resolve(process.env.PLUGINS_DIR ?? "../../plugins");

  return {
    host: process.env.HOST ?? "0.0.0.0",
    port: envInt("PORT", 8080),
    dataDir,
    dbPath: process.env.DB_PATH ?? resolve(dataDir, "streamdesk.sqlite"),
    iconsDir,
    pluginsDir,
    logLevel: (process.env.LOG_LEVEL as ServerConfig["logLevel"]) ?? "info",
    actionTimeoutMs: envInt("ACTION_TIMEOUT_MS", 10_000),
    heartbeatIntervalMs: envInt("HEARTBEAT_INTERVAL_MS", 15_000),
    heartbeatTimeoutMs: envInt("HEARTBEAT_TIMEOUT_MS", 45_000),
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
  };
}
