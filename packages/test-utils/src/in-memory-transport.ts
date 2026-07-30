import { EventEmitter } from "node:events";

/**
 * A tiny in-memory duplex "socket" pair used by integration tests to
 * exercise the Server's message handling logic without a real network
 * WebSocket. Each side implements just enough of the `ws` client surface
 * (on("message"), send()) that the Server/Connect/Interface message
 * handlers can be tested in isolation.
 */
export class InMemorySocket extends EventEmitter {
  private peer?: InMemorySocket;

  linkTo(peer: InMemorySocket): void {
    this.peer = peer;
  }

  send(data: string): void {
    queueMicrotask(() => {
      this.peer?.emit("message", Buffer.from(data));
    });
  }

  close(): void {
    this.emit("close");
    this.peer?.emit("close");
  }
}

export function createSocketPair(): [InMemorySocket, InMemorySocket] {
  const a = new InMemorySocket();
  const b = new InMemorySocket();
  a.linkTo(b);
  b.linkTo(a);
  return [a, b];
}
