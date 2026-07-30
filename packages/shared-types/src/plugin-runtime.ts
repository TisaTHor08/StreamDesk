/**
 * Runtime contracts shared by both the Server SDK and the Connect SDK
 * (kept here, rather than duplicated or cross-imported, so connect-sdk
 * never has to depend on server-sdk or vice versa).
 */

export type PluginLogger = {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
};

/**
 * Namespaced key/value storage given to every plugin. The Server implements
 * this on top of the `plugin_storage` SQLite table, scoped by pluginId so
 * plugins cannot read or write each other's data.
 */
export type PluginStorage = {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
};
