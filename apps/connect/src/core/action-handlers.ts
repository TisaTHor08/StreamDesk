export type ConnectActionHandler = (input: unknown) => Promise<unknown>;

export class ActionHandlerRegistry {
  private readonly handlers = new Map<string, ConnectActionHandler>();

  register(actionId: string, handler: ConnectActionHandler): void {
    if (this.handlers.has(actionId)) {
      throw new Error(`Connect action handler for "${actionId}" is already registered`);
    }
    this.handlers.set(actionId, handler);
  }

  get(actionId: string): ConnectActionHandler | undefined {
    return this.handlers.get(actionId);
  }
}
