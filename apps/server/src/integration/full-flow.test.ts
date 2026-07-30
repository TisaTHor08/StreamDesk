import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createEnvelope, MESSAGE_TYPES, tryParseEnvelope, type ProtocolEnvelope } from "@streamdesk/protocol";
import type { DeckPage } from "@streamdesk/shared-types";
import { loadConfig } from "../config.js";
import { createLogger } from "../logging/logger.js";
import { openDatabase } from "../db/client.js";
import { Runtime } from "../core/runtime.js";
import { loadPlugins } from "../plugins/loader.js";
import { seedDefaultPageIfEmpty } from "../bootstrap/seed.js";
import { buildApp } from "../http/app.js";

/**
 * End-to-end integration test exercising the full loop described in
 * ARCHITECTURE.md: Interface press -> Server -> action router -> Server
 * (for a server-executed action) or Connect (for a connect-executed
 * action) -> result -> data source update -> Interface. Uses the *real*
 * `core-actions` and `example-plugin` plugins loaded from /plugins, a
 * real (temp-file) SQLite database, and real `ws` clients — only the
 * repo-root plugins directory and a throwaway port are test-specific.
 */

class WsTestClient {
  readonly received: ProtocolEnvelope[] = [];
  private readonly socket: WebSocket;
  private readonly instanceId: string;
  private readonly role: "interface" | "connect";

  constructor(url: string, role: "interface" | "connect", instanceId: string) {
    this.role = role;
    this.instanceId = instanceId;
    this.socket = new WebSocket(url);
  }

  async waitOpen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.once("open", () => resolve());
      this.socket.once("error", reject);
    });
    this.socket.on("message", (raw: Buffer) => {
      const parsed = tryParseEnvelope(JSON.parse(raw.toString()));
      if (parsed.ok) this.received.push(parsed.envelope);
    });
  }

  send(type: string, payload: unknown): void {
    const envelope = createEnvelope({
      type,
      source: { role: this.role, instanceId: this.instanceId },
      payload,
    });
    this.socket.send(JSON.stringify(envelope));
  }

  async waitForType(type: string, timeoutMs = 5000): Promise<ProtocolEnvelope> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = this.received.find((e) => e.type === type);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`Timed out waiting for message type "${type}". Received: ${this.received.map((e) => e.type).join(", ")}`);
  }

  close(): void {
    this.socket.close();
  }
}

describe("full flow: interface press -> server -> action -> data source -> interface", () => {
  let dataDir: string;
  let runtime: Runtime;
  let baseUrl: string;
  let wsBaseUrl: string;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    dataDir = mkdtempSync(join(tmpdir(), "streamdesk-test-"));
    process.env.DATA_DIR = dataDir;
    process.env.PLUGINS_DIR = resolve(currentDir, "../../../../plugins");
    process.env.PORT = "0";

    const config = loadConfig();
    const logger = createLogger("error");
    const db = openDatabase(config.dbPath, logger);
    runtime = new Runtime(db, config, logger);

    await loadPlugins(runtime);
    seedDefaultPageIfEmpty(runtime);

    const app = await buildApp(runtime);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
    wsBaseUrl = `ws://127.0.0.1:${port}`;
    close = async () => {
      await app.close();
      db.close();
    };
  }, 20000);

  afterAll(async () => {
    await close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("loaded core-actions and example-plugin", () => {
    const plugins = runtime.repos.plugins.list().map((p) => p.manifest.id);
    expect(plugins).toContain("core-actions");
    expect(plugins).toContain("example-plugin");
    expect(runtime.actions.get("example.counter.increment")).toBeDefined();
  });

  it("increments the counter via a server-executed action and pushes the new value to the Interface", async () => {
    const iface = new WsTestClient(`${wsBaseUrl}/ws/interface`, "interface", "test-iface-1");
    await iface.waitOpen();

    iface.send(MESSAGE_TYPES.INTERFACE_REGISTER, {
      interfaceId: "test-iface-1",
      name: "Test Interface",
      userAgent: "vitest",
      viewport: { width: 1024, height: 600, pixelRatio: 1, orientation: "landscape" },
      supportedFeatures: [],
    });

    const accepted = await iface.waitForType(MESSAGE_TYPES.SERVER_INTERFACE_ACCEPTED);
    expect(accepted).toBeDefined();

    const snapshot = await iface.waitForType(MESSAGE_TYPES.SERVER_PAGE_SNAPSHOT);
    const page = (snapshot.payload as { page: DeckPage }).page;
    expect(page.slug).toBe("home");

    const counterButton = page.widgets.find((w) =>
      w.interactions?.some((i) => i.actionId === "example.counter.increment"),
    );
    expect(counterButton).toBeDefined();

    const counterDisplay = page.widgets.find((w) =>
      w.bindings?.some((b) => b.dataSourceId === "example.counter.value"),
    );
    expect(counterDisplay).toBeDefined();

    iface.send(MESSAGE_TYPES.INTERFACE_WIDGET_INTERACT, {
      pageId: page.id,
      widgetId: counterButton!.id,
      trigger: "press",
    });

    const update = await iface.waitForType(MESSAGE_TYPES.SERVER_WIDGET_STATE_UPDATE);
    const payload = update.payload as { widgetId: string; value: number };
    expect(payload.widgetId).toBe(counterDisplay!.id);
    expect(payload.value).toBe(1);

    iface.close();
  }, 10000);

  it("routes a connect-executed action to a registered Connect and gets a result back", async () => {
    const connect = new WsTestClient(`${wsBaseUrl}/ws/connect`, "connect", "test-connect-1");
    await connect.waitOpen();

    connect.send(MESSAGE_TYPES.CONNECT_REGISTER, {
      connectId: "test-connect-1",
      name: "Test Connect",
      platform: "linux",
      architecture: "x64",
      version: "0.1.0",
      capabilities: [
        {
          id: "example.ping",
          version: "1.0.0",
          providerPluginId: "example-plugin",
          actions: ["example.counter.ping"],
          events: [],
          dataSources: [],
        },
      ],
    });

    await connect.waitForType(MESSAGE_TYPES.SERVER_CONNECT_ACCEPTED);

    // Answer any action.execute the server routes to us.
    const executePromise = connect.waitForType(MESSAGE_TYPES.SERVER_ACTION_EXECUTE);

    const resultPromise = runtime.router.execute({
      executionId: "exec-test-1",
      actionId: "example.counter.ping",
      input: {},
      target: { mode: "automatic" },
      requestedBy: { type: "api", id: "test" },
    });

    const executeEnvelope = await executePromise;
    const executeRequest = executeEnvelope.payload as { executionId: string };
    connect.send(MESSAGE_TYPES.CONNECT_ACTION_RESULT, {
      executionId: executeRequest.executionId,
      status: "success",
      output: { pong: true },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    const result = await resultPromise;
    expect(result.status).toBe("success");
    expect(result.output).toEqual({ pong: true });

    connect.close();
  }, 10000);

  it("returns NO_COMPATIBLE_CONNECT when no Connect offers the action", async () => {
    const result = await runtime.router.execute({
      executionId: "exec-test-2",
      actionId: "system.url.open",
      input: { url: "https://example.com" },
      target: { mode: "automatic" },
      requestedBy: { type: "api", id: "test" },
    });
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("NO_COMPATIBLE_CONNECT");
  });
});
