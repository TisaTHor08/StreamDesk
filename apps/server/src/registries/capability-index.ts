import type { CapabilityDescriptor } from "@streamdesk/shared-types";

/**
 * Live index of which online Connect instances can serve which action ids.
 * Rebuilt from `connect.register` / `connect.capabilities.update` messages
 * and pruned when a Connect goes offline. This is what the action router
 * consults to answer "which Connect(s) can run this action?" (section 19).
 */
export class CapabilityIndex {
  private readonly byConnect = new Map<string, CapabilityDescriptor[]>();

  setCapabilities(connectId: string, capabilities: CapabilityDescriptor[]): void {
    this.byConnect.set(connectId, capabilities);
  }

  remove(connectId: string): void {
    this.byConnect.delete(connectId);
  }

  /** Connect ids (still tracked as online) that expose the given action id. */
  connectsForAction(actionId: string): string[] {
    const matches: string[] = [];
    for (const [connectId, capabilities] of this.byConnect) {
      if (capabilities.some((cap) => cap.actions.includes(actionId))) {
        matches.push(connectId);
      }
    }
    return matches;
  }

  capabilitiesOf(connectId: string): CapabilityDescriptor[] {
    return this.byConnect.get(connectId) ?? [];
  }
}
