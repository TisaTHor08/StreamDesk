import type { JsonSchema } from "./json-schema.js";

export type DataSourceUpdateMode = "push" | "poll" | "computed";

/** Static definition of a data source, registered by a plugin. */
export type DataSourceDefinition = {
  id: string;
  pluginId: string;
  displayName: string;
  valueSchema: JsonSchema;
  updateMode: DataSourceUpdateMode;
};

export type DataSourceQuality = "good" | "stale" | "unavailable";

/** The latest known value of a data source, as tracked by the Server. */
export type DataSourceValue = {
  dataSourceId: string;
  sourceConnectId?: string;
  value: unknown;
  updatedAt: string;
  quality: DataSourceQuality;
};
