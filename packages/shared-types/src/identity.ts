/**
 * Identity contracts for the three runtime roles: Interface, Server, Connect.
 * See docs/architecture/roles.md for the responsibilities of each role.
 */

export type Platform = "windows" | "linux" | "macos";
export type Architecture = "x64" | "arm64";

/** A single capability a Connect (via a plugin) exposes to the Server. */
export type CapabilityDescriptor = {
  id: string;
  version: string;
  providerPluginId: string;
  actions: string[];
  events: string[];
  dataSources: string[];
  metadata?: Record<string, unknown>;
};

/** Payload an Interface sends when it first connects (interface.register). */
export type InterfaceRegistration = {
  interfaceId: string;
  name: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    pixelRatio: number;
    orientation: "portrait" | "landscape";
  };
  supportedFeatures: string[];
  /** Pairing token issued by the Server on first pairing, empty on first contact. */
  token?: string;
};

/** Payload a Connect sends when it first connects (connect.register). */
export type ConnectRegistration = {
  connectId: string;
  name: string;
  platform: Platform;
  architecture: Architecture;
  version: string;
  capabilities: CapabilityDescriptor[];
  /** Pairing token issued by the Server on first pairing, empty on first contact. */
  token?: string;
};

export type ConnectionStatus = "online" | "offline";

/** Server-side record of a known Interface instance. */
export type InterfaceRecord = InterfaceRegistration & {
  status: ConnectionStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  revoked: boolean;
};

/** Server-side record of a known Connect instance. */
export type ConnectRecord = Omit<ConnectRegistration, "capabilities"> & {
  capabilities: CapabilityDescriptor[];
  status: ConnectionStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  revoked: boolean;
  uptimeSeconds?: number;
};
