/**
 * Declarative permission identifiers a plugin manifest can request.
 *
 * V1 note: these are DECLARED, STORED and DISPLAYED to the operator. There is
 * currently no process-level sandbox enforcing them (plugins run in-process
 * as trusted code). See docs/architecture/security.md and ADR-010.
 */
export const PLUGIN_PERMISSIONS = [
  "network.local",
  "network.internet",
  "filesystem.read",
  "filesystem.write",
  "process.launch",
  "process.observe",
  "input.keyboard",
  "input.mouse",
  "clipboard.read",
  "clipboard.write",
  "events.publish",
  "events.subscribe",
  "plugin.storage",
  "plugin.interop",
] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export function isKnownPermission(value: string): value is PluginPermission {
  return (PLUGIN_PERMISSIONS as readonly string[]).includes(value);
}
