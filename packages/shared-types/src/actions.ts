import type { JsonSchema } from "./json-schema.js";

export type ExecutionLocation = "server" | "connect";

/** Where the Server should route an action execution request. */
export type ActionTarget = {
  mode: "automatic" | "specific";
  connectId?: string;
};

/** Static definition of an action, registered by a plugin. */
export type ActionDefinition = {
  id: string;
  pluginId: string;
  displayName: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  requiredCapabilities?: string[];
  executionLocation: ExecutionLocation;
};

export type ActionRequester =
  | { type: "widget"; id: string }
  | { type: "automation"; id: string }
  | { type: "api"; id: string }
  | { type: "system"; id: string };

/** A single request to execute an action, submitted to the Server's router. */
export type ActionExecutionRequest = {
  executionId: string;
  actionId: string;
  input: unknown;
  target?: ActionTarget;
  requestedBy: ActionRequester;
};

export type ActionExecutionStatus = "success" | "error" | "timeout" | "cancelled";

export type ActionErrorCode =
  | "ACTION_NOT_FOUND"
  | "INVALID_ACTION_INPUT"
  | "NO_COMPATIBLE_CONNECT"
  | "CONNECT_OFFLINE"
  | "ACTION_TIMEOUT"
  | "ACTION_EXECUTION_FAILED"
  | "PERMISSION_DENIED"
  | "PLUGIN_DISABLED";

export type ActionExecutionResult = {
  executionId: string;
  status: ActionExecutionStatus;
  output?: unknown;
  error?: {
    code: ActionErrorCode;
    message: string;
    details?: unknown;
  };
  startedAt: string;
  completedAt: string;
};
