import { describe, expect, it } from "vitest";
import { createEnvelope } from "./envelope.js";
import { MESSAGE_TYPES } from "./message-types.js";
import { parseEnvelope, tryParseEnvelope } from "./validate.js";

describe("parseEnvelope", () => {
  it("accepts a well-formed interface.register envelope", () => {
    const envelope = createEnvelope({
      type: MESSAGE_TYPES.INTERFACE_REGISTER,
      source: { role: "interface", instanceId: "iface-1" },
      payload: {
        interfaceId: "iface-1",
        name: "Test Tablet",
        userAgent: "vitest",
        viewport: { width: 1024, height: 600, pixelRatio: 1, orientation: "landscape" },
        supportedFeatures: [],
      },
    });

    const parsed = parseEnvelope(envelope);
    expect(parsed.type).toBe(MESSAGE_TYPES.INTERFACE_REGISTER);
    expect((parsed.payload as { interfaceId: string }).interfaceId).toBe("iface-1");
  });

  it("rejects an envelope with an unsupported protocol version", () => {
    const envelope = createEnvelope({
      type: MESSAGE_TYPES.INTERFACE_HEARTBEAT,
      source: { role: "interface", instanceId: "iface-1" },
      payload: {},
    });
    const tampered = { ...envelope, protocolVersion: "99" };

    const result = tryParseEnvelope(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNSUPPORTED_PROTOCOL_VERSION");
  });

  it("rejects an unknown message type", () => {
    const envelope = createEnvelope({
      type: "interface.does-not-exist",
      source: { role: "interface", instanceId: "iface-1" },
      payload: {},
    });

    const result = tryParseEnvelope(envelope);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNKNOWN_MESSAGE_TYPE");
  });

  it("rejects a payload that fails schema validation", () => {
    const envelope = createEnvelope({
      type: MESSAGE_TYPES.INTERFACE_WIDGET_INTERACT,
      source: { role: "interface", instanceId: "iface-1" },
      payload: { pageId: "page-1" }, // missing widgetId / trigger
    });

    const result = tryParseEnvelope(envelope);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });

  it("round-trips a connect.register envelope", () => {
    const envelope = createEnvelope({
      type: MESSAGE_TYPES.CONNECT_REGISTER,
      source: { role: "connect", instanceId: "connect-1" },
      payload: {
        connectId: "connect-1",
        name: "Test Connect",
        platform: "linux",
        architecture: "x64",
        version: "0.1.0",
        capabilities: [
          {
            id: "core.system",
            version: "1.0.0",
            providerPluginId: "core-actions",
            actions: ["core.log.write"],
            events: [],
            dataSources: [],
          },
        ],
      },
    });

    const parsed = parseEnvelope(envelope);
    expect(parsed.type).toBe(MESSAGE_TYPES.CONNECT_REGISTER);
  });
});
