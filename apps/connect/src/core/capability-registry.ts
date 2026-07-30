import type { CapabilityDescriptor } from "@streamdesk/shared-types";

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, CapabilityDescriptor>();
  private onChange?: () => void;

  register(capability: CapabilityDescriptor): void {
    this.capabilities.set(capability.id, capability);
    this.onChange?.();
  }

  list(): CapabilityDescriptor[] {
    return [...this.capabilities.values()];
  }

  /** Invoked by the WS client so it can push `connect.capabilities.update` after connecting. */
  subscribe(handler: () => void): void {
    this.onChange = handler;
  }
}
