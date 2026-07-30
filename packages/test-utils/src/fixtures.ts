import type {
  CapabilityDescriptor,
  ConnectRegistration,
  DeckPage,
  InterfaceRegistration,
} from "@streamdesk/shared-types";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeInterfaceRegistration(
  overrides: Partial<InterfaceRegistration> = {},
): InterfaceRegistration {
  return {
    interfaceId: nextId("interface"),
    name: "Test Interface",
    userAgent: "vitest",
    viewport: { width: 1024, height: 600, pixelRatio: 1, orientation: "landscape" },
    supportedFeatures: [],
    ...overrides,
  };
}

export function makeCapability(overrides: Partial<CapabilityDescriptor> = {}): CapabilityDescriptor {
  return {
    id: "core.system",
    version: "1.0.0",
    providerPluginId: "core-actions",
    actions: ["core.log.write"],
    events: [],
    dataSources: ["system.hostname"],
    ...overrides,
  };
}

export function makeConnectRegistration(
  overrides: Partial<ConnectRegistration> = {},
): ConnectRegistration {
  return {
    connectId: nextId("connect"),
    name: "Test Connect",
    platform: "linux",
    architecture: "x64",
    version: "0.1.0",
    capabilities: [makeCapability()],
    ...overrides,
  };
}

export function makeDeckPage(overrides: Partial<DeckPage> = {}): DeckPage {
  const now = new Date().toISOString();
  return {
    schemaVersion: "1",
    id: nextId("page"),
    name: "Test Page",
    slug: "test-page",
    grid: { columns: 4, rowHeight: 96, gap: 8 },
    widgets: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
