import type { LogComponent, LogEntry, LogLevel } from "@streamdesk/shared-types";
import type { PluginLogger } from "@streamdesk/shared-types";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const SECRET_KEY_PATTERN = /token|secret|password|authorization/i;

function redact(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return context;
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    clone[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : value;
  }
  return clone;
}

export type Logger = {
  child(componentId: string): Logger;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  toPluginLogger(): PluginLogger;
};

export function createLogger(minLevel: LogLevel, componentId = "connect"): Logger {
  const component: LogComponent = "connect";

  function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      componentId,
      message,
      context: redact(context),
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    child: (childId) => createLogger(minLevel, childId),
    debug: (m, c) => write("debug", m, c),
    info: (m, c) => write("info", m, c),
    warn: (m, c) => write("warn", m, c),
    error: (m, c) => write("error", m, c),
    toPluginLogger: () => ({
      debug: (m, c) => write("debug", m, c),
      info: (m, c) => write("info", m, c),
      warn: (m, c) => write("warn", m, c),
      error: (m, c) => write("error", m, c),
    }),
  };
}
