import type Database from "better-sqlite3";
import type { PublishedEvent } from "@streamdesk/shared-types";

const HISTORY_LIMIT = 1000;

export class EventsRepository {
  constructor(private readonly db: Database.Database) {}

  record(event: PublishedEvent): void {
    this.db
      .prepare(
        `INSERT INTO event_log (event_id, event_type, source_plugin_id, source_connect_id, payload, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.eventId,
        event.eventType,
        event.sourcePluginId,
        event.sourceConnectId ?? null,
        JSON.stringify(event.payload ?? null),
        event.timestamp,
      );

    this.db
      .prepare(
        `DELETE FROM event_log WHERE event_id NOT IN (
           SELECT event_id FROM event_log ORDER BY timestamp DESC LIMIT ?
         )`,
      )
      .run(HISTORY_LIMIT);
  }

  recent(limit = 200): unknown[] {
    return this.db.prepare("SELECT * FROM event_log ORDER BY timestamp DESC LIMIT ?").all(limit);
  }
}
