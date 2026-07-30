import { describe, expect, it } from "vitest";
import { ActionRegistry } from "./action-registry.js";

const definition = {
  id: "test.action",
  pluginId: "test-plugin",
  displayName: "Test action",
  inputSchema: { type: "object" as const },
  executionLocation: "server" as const,
};

describe("ActionRegistry", () => {
  it("registers a server action with a handler", () => {
    const registry = new ActionRegistry();
    const handler = async () => ({ status: "success" as const, output: {} });
    registry.register(definition, handler);

    const entry = registry.get("test.action");
    expect(entry?.definition.id).toBe("test.action");
    expect(entry?.handler).toBe(handler);
  });

  it("throws when registering a server action without a handler", () => {
    const registry = new ActionRegistry();
    expect(() => registry.register(definition)).toThrow();
  });

  it("does not require a handler for connect-executed actions", () => {
    const registry = new ActionRegistry();
    expect(() => registry.register({ ...definition, id: "test.connect-action", executionLocation: "connect" })).not.toThrow();
  });

  it("rejects duplicate registrations", () => {
    const registry = new ActionRegistry();
    registry.register(definition, async () => ({ status: "success" as const }));
    expect(() => registry.register(definition, async () => ({ status: "success" as const }))).toThrow();
  });

  it("unregisters all actions belonging to a plugin", () => {
    const registry = new ActionRegistry();
    registry.register(definition, async () => ({ status: "success" as const }));
    registry.unregisterByPlugin("test-plugin");
    expect(registry.get("test.action")).toBeUndefined();
  });
});
