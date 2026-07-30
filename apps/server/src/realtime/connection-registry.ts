import type { ProtocolEnvelope } from "@streamdesk/protocol";

export type SendFn = (envelope: ProtocolEnvelope) => void;

type InterfaceConnection = {
  interfaceId: string;
  send: SendFn;
  currentPageId?: string;
};

type ConnectConnection = {
  connectId: string;
  send: SendFn;
};

/**
 * Tracks currently-open WebSocket connections for Interfaces and Connects.
 * Interface <-> Connect never talk directly (Règle 5) — everything routes
 * through lookups in this registry.
 */
export class ConnectionRegistry {
  private readonly interfaces = new Map<string, InterfaceConnection>();
  private readonly connects = new Map<string, ConnectConnection>();

  addInterface(interfaceId: string, send: SendFn): void {
    this.interfaces.set(interfaceId, { interfaceId, send });
  }

  removeInterface(interfaceId: string): void {
    this.interfaces.delete(interfaceId);
  }

  setInterfaceCurrentPage(interfaceId: string, pageId: string): void {
    const conn = this.interfaces.get(interfaceId);
    if (conn) conn.currentPageId = pageId;
  }

  sendToInterface(interfaceId: string, envelope: ProtocolEnvelope): boolean {
    const conn = this.interfaces.get(interfaceId);
    if (!conn) return false;
    conn.send(envelope);
    return true;
  }

  broadcastToInterfaces(envelope: ProtocolEnvelope, filter?: (conn: { currentPageId?: string }) => boolean): void {
    for (const conn of this.interfaces.values()) {
      if (!filter || filter(conn)) conn.send(envelope);
    }
  }

  listInterfaceIds(): string[] {
    return [...this.interfaces.keys()];
  }

  interfacesOnPage(pageId: string): InterfaceConnection[] {
    return [...this.interfaces.values()].filter((conn) => conn.currentPageId === pageId);
  }

  addConnect(connectId: string, send: SendFn): void {
    this.connects.set(connectId, { connectId, send });
  }

  removeConnect(connectId: string): void {
    this.connects.delete(connectId);
  }

  sendToConnect(connectId: string, envelope: ProtocolEnvelope): boolean {
    const conn = this.connects.get(connectId);
    if (!conn) return false;
    conn.send(envelope);
    return true;
  }

  isConnectOnline(connectId: string): boolean {
    return this.connects.has(connectId);
  }

  listConnectIds(): string[] {
    return [...this.connects.keys()];
  }
}
