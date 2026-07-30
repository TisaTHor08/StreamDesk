import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import os from "node:os";
import type { Architecture, Platform } from "@streamdesk/shared-types";

export type ConnectConfig = {
  serverUrl: string;
  name: string;
  dataDir: string;
  pluginsDir: string;
  platform: Platform;
  architecture: Architecture;
  logLevel: "debug" | "info" | "warn" | "error";
  heartbeatIntervalMs: number;
  healthPort: number;
};

function detectPlatform(): Platform {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    default:
      return "linux";
  }
}

function detectArchitecture(): Architecture {
  return process.arch === "arm64" ? "arm64" : "x64";
}

export function loadConfig(): ConnectConfig {
  const dataDir = resolve(process.env.DATA_DIR ?? "./data");
  mkdirSync(dataDir, { recursive: true });

  return {
    serverUrl: process.env.SERVER_URL ?? "ws://localhost:8080",
    name: process.env.CONNECT_NAME ?? os.hostname(),
    dataDir,
    pluginsDir: resolve(process.env.PLUGINS_DIR ?? "../../plugins"),
    platform: detectPlatform(),
    architecture: detectArchitecture(),
    logLevel: (process.env.LOG_LEVEL as ConnectConfig["logLevel"]) ?? "info",
    heartbeatIntervalMs: Number.parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? "15000", 10),
    healthPort: Number.parseInt(process.env.HEALTH_PORT ?? "8081", 10),
  };
}
