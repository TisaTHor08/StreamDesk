import type { LogComponent, LogEntry, LogLevel } from "@streamdesk/shared-types";
import type { PluginLogger } from "@streamdesk/shared-types";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const SECRET_KEY_PATTERN = /token|secret|password|authorization/i;

/** Recursively strips values under obviously-secret-looking keys before logging. */
function redact(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!context) return context;
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      clone[key] = "[redacted]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      clone[key] = redact(value as Record<string, unknown>);
    } else {
      clone[key] = value;
    }
  }
  return clone;
}

export type Logger = {
  child(component: LogComponent, componentId?: string): Logger;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  withCorrelation(correlationId: string): Logger;
  toPluginLogger(): PluginLogger;
};

export function createLogger(
  minLevel: LogLevel,
  component: LogComponent = "server",
  componentId?: string,
  correlationId?: string,
): Logger {
  function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      componentId,
      message,
      context: redact(context),
      correlationId,
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    child: (childComponent, childId) => createLogger(minLevel, childComponent, childId, correlationId),
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
    withCorrelation: (id) => createLogger(minLevel, component, componentId, id),
    toPluginLogger: () => ({
      debug: (message, context) => write("debug", message, context),
      info: (message, context) => write("info", message, context),
      warn: (message, context) => write("warn", message, context),
      error: (message, context) => write("error", message, context),
    }),
  };
}
