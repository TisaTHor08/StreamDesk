import type Database from "better-sqlite3";
import type { DataSourceValue } from "@streamdesk/shared-types";

type Row = {
  data_source_id: string;
  source_connect_id: string | null;
  value: string | null;
  updated_at: string;
  quality: string;
};

function rowToValue(row: Row): DataSourceValue {
  return {
    dataSourceId: row.data_source_id,
    sourceConnectId: row.source_connect_id ?? undefined,
    value: row.value ? JSON.parse(row.value) : null,
    updatedAt: row.updated_at,
    quality: row.quality as DataSourceValue["quality"],
  };
}

export class DataSourcesRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(value: DataSourceValue): void {
    this.db
      .prepare(
        `INSERT INTO data_source_values (data_source_id, source_connect_id, value, updated_at, quality)
         VALUES (@data_source_id, @source_connect_id, @value, @updated_at, @quality)
         ON CONFLICT(data_source_id) DO UPDATE SET
           source_connect_id = excluded.source_connect_id,
           value = excluded.value,
           updated_at = excluded.updated_at,
           quality = excluded.quality`,
      )
      .run({
        data_source_id: value.dataSourceId,
        source_connect_id: value.sourceConnectId ?? null,
        value: JSON.stringify(value.value ?? null),
        updated_at: value.updatedAt,
        quality: value.quality,
      });
  }

  getLatest(dataSourceId: string): DataSourceValue | null {
    const row = this.db
      .prepare("SELECT * FROM data_source_values WHERE data_source_id = ?")
      .get(dataSourceId) as Row | undefined;
    return row ? rowToValue(row) : null;
  }

  markUnavailable(dataSourceId: string, now: string): void {
    this.db
      .prepare("UPDATE data_source_values SET quality = 'unavailable', updated_at = ? WHERE data_source_id = ?")
      .run(now, dataSourceId);
  }

  all(): DataSourceValue[] {
    return (this.db.prepare("SELECT * FROM data_source_values").all() as Row[]).map(rowToValue);
  }
}
