import type { PluginPermission } from "@streamdesk/shared-types";
import type { Architecture, Platform } from "@streamdesk/shared-types";

export type PluginComponentEntry = {
  entrypoint: string;
};

export type PluginConnectComponentEntry = PluginComponentEntry & {
  platforms?: Platform[];
  architectures?: Architecture[];
};

export type PluginComponents = {
  server?: PluginComponentEntry;
  connect?: PluginConnectComponentEntry;
  interface?: PluginComponentEntry;
};

export type PluginContributions = {
  actions?: string[];
  events?: string[];
  dataSources?: string[];
  widgets?: string[];
  presets?: string[];
  themes?: string[];
};

export type PluginAuthor = {
  name: string;
  url?: string;
  email?: string;
};

/**
 * Structure of a `plugin.json` manifest. All three `components` entries are
 * optional — a plugin may contribute only a Server part, only a Connect
 * part, only an Interface part, or any combination.
 */
export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  license: string;
  description?: string;
  author: PluginAuthor;
  components: PluginComponents;
  contributes: PluginContributions;
  permissions: PluginPermission[];
};

export type PluginRuntimeState = "enabled" | "disabled" | "error";

export type InstalledPlugin = {
  manifest: PluginManifest;
  /** Absolute path to the directory containing plugin.json. */
  directory: string;
  state: PluginRuntimeState;
  lastError?: string;
  installedAt: string;
  updatedAt: string;
};

/** Currently supported plugin manifest API version. Bump with a migration when the contract changes. */
export const SUPPORTED_PLUGIN_API_VERSION = "1";
