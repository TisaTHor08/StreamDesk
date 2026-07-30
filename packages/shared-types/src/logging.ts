export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogComponent = "server" | "connect" | "interface" | "plugin";

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  component: LogComponent;
  componentId?: string;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
};
