import { MESSAGE_TYPES, createEnvelope } from "@streamdesk/protocol";
import type {
  ActionErrorCode,
  ActionExecutionRequest,
  ActionExecutionResult,
} from "@streamdesk/shared-types";
import type { ActionRegistry } from "../registries/action-registry.js";
import type { CapabilityIndex } from "../registries/capability-index.js";
import type { ConnectionRegistry } from "../realtime/connection-registry.js";
import type { ExecutionsRepository } from "../db/repositories/executions.repo.js";
import type { Logger } from "../logging/logger.js";
import { validateAgainstSchema } from "../validation/json-schema-validator.js";
import type { PluginsRepository } from "../db/repositories/plugins.repo.js";

type PendingExecution = {
  resolve: (result: ActionExecutionResult) => void;
  timeoutHandle: NodeJS.Timeout;
};

function errorResult(
  executionId: string,
  code: ActionErrorCode,
  message: string,
  startedAt: string,
  details?: unknown,
): ActionExecutionResult {
  return {
    executionId,
    status: code === "ACTION_TIMEOUT" ? "timeout" : "error",
    error: { code, message, details },
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Implements the routing algorithm from architecture section 19:
 * validate -> resolve action -> validate input -> pick execution location
 * -> execute locally or dispatch to a Connect -> await result (with
 * timeout) -> persist -> return.
 */
export class ActionRouter {
  private readonly pending = new Map<string, PendingExecution>();

  constructor(
    private readonly actions: ActionRegistry,
    private readonly capabilities: CapabilityIndex,
    private readonly connections: ConnectionRegistry,
    private readonly executions: ExecutionsRepository,
    private readonly plugins: PluginsRepository,
    private readonly logger: Logger,
    private readonly actionTimeoutMs: number,
  ) {}

  async execute(request: ActionExecutionRequest): Promise<ActionExecutionResult> {
    const startedAt = new Date().toISOString();
    this.executions.recordStart(request, startedAt);

    const registered = this.actions.get(request.actionId);
    if (!registered) {
      return this.finish(errorResult(request.executionId, "ACTION_NOT_FOUND", `Unknown action "${request.actionId}"`, startedAt));
    }

    const plugin = this.plugins.getById(registered.definition.pluginId);
    if (plugin && plugin.state === "disabled") {
      return this.finish(
        errorResult(request.executionId, "PLUGIN_DISABLED", `Plugin "${plugin.manifest.id}" is disabled`, startedAt),
      );
    }

    const validation = validateAgainstSchema(registered.definition.inputSchema, request.input);
    if (!validation.valid) {
      return this.finish(
        errorResult(request.executionId, "INVALID_ACTION_INPUT", "Action input failed validation", startedAt, validation.errors),
      );
    }

    if (registered.definition.executionLocation === "server") {
      return this.executeOnServer(request, registered.handler!, startedAt);
    }

    return this.executeOnConnect(request, startedAt);
  }

  private async executeOnServer(
    request: ActionExecutionRequest,
    handler: NonNullable<ReturnType<ActionRegistry["get"]>>["handler"],
    startedAt: string,
  ): Promise<ActionExecutionResult> {
    try {
      const outcome = await handler!(request);
      return this.finish({
        executionId: request.executionId,
        status: outcome.status,
        output: outcome.output,
        error: outcome.error,
        startedAt,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      return this.finish(
        errorResult(
          request.executionId,
          "ACTION_EXECUTION_FAILED",
          error instanceof Error ? error.message : "Unknown server action error",
          startedAt,
        ),
      );
    }
  }

  private async executeOnConnect(
    request: ActionExecutionRequest,
    startedAt: string,
  ): Promise<ActionExecutionResult> {
    const targetConnectId = this.resolveTarget(request);
    if (!targetConnectId) {
      const code: ActionErrorCode =
        request.target?.mode === "specific" ? "CONNECT_OFFLINE" : "NO_COMPATIBLE_CONNECT";
      return this.finish(
        errorResult(request.executionId, code, "No online Connect available to run this action", startedAt),
      );
    }

    const envelope = createEnvelope({
      type: MESSAGE_TYPES.SERVER_ACTION_EXECUTE,
      source: { role: "server", instanceId: "server" },
      payload: request,
    });

    const sent = this.connections.sendToConnect(targetConnectId, envelope);
    if (!sent) {
      return this.finish(
        errorResult(request.executionId, "CONNECT_OFFLINE", `Connect "${targetConnectId}" is offline`, startedAt),
      );
    }

    return new Promise<ActionExecutionResult>((resolve) => {
      const timeoutHandle = setTimeout(() => {
        this.pending.delete(request.executionId);
        resolve(this.finish(errorResult(request.executionId, "ACTION_TIMEOUT", "Action execution timed out", startedAt)));
      }, this.actionTimeoutMs);

      this.pending.set(request.executionId, { resolve: (result) => resolve(this.finish(result)), timeoutHandle });
    });
  }

  /** Called by the Connect WS handler when a `connect.action.result` arrives. */
  resolveFromConnect(result: ActionExecutionResult): boolean {
    const pending = this.pending.get(result.executionId);
    if (!pending) {
      this.logger.warn("Received action result for unknown/expired execution", {
        executionId: result.executionId,
      });
      return false;
    }
    clearTimeout(pending.timeoutHandle);
    this.pending.delete(result.executionId);
    pending.resolve(result);
    return true;
  }

  private resolveTarget(request: ActionExecutionRequest): string | undefined {
    if (request.target?.mode === "specific" && request.target.connectId) {
      return this.connections.isConnectOnline(request.target.connectId) ? request.target.connectId : undefined;
    }
    const candidates = this.capabilities.connectsForAction(request.actionId);
    return candidates.find((id) => this.connections.isConnectOnline(id));
  }

  private finish(result: ActionExecutionResult): ActionExecutionResult {
    this.executions.recordResult(result);
    if (result.status !== "success") {
      this.logger.warn("Action execution did not succeed", {
        executionId: result.executionId,
        status: result.status,
        error: result.error,
      });
    }
    return result;
  }
}
