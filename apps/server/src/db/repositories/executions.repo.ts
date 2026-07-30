import type Database from "better-sqlite3";
import type { ActionExecutionRequest, ActionExecutionResult } from "@streamdesk/shared-types";

const HISTORY_LIMIT = 500;

export class ExecutionsRepository {
  constructor(private readonly db: Database.Database) {}

  recordStart(request: ActionExecutionRequest, startedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO action_executions (execution_id, action_id, status, input, requested_by, target, started_at)
         VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
      )
      .run(
        request.executionId,
        request.actionId,
        JSON.stringify(request.input ?? null),
        JSON.stringify(request.requestedBy),
        request.target ? JSON.stringify(request.target) : null,
        startedAt,
      );
  }

  recordResult(result: ActionExecutionResult): void {
    this.db
      .prepare(
        `UPDATE action_executions SET status = ?, output = ?, error = ?, completed_at = ? WHERE execution_id = ?`,
      )
      .run(
        result.status,
        result.output !== undefined ? JSON.stringify(result.output) : null,
        result.error ? JSON.stringify(result.error) : null,
        result.completedAt,
        result.executionId,
      );

    // keep the table bounded (Règle: "historique limité")
    this.db
      .prepare(
        `DELETE FROM action_executions WHERE execution_id NOT IN (
           SELECT execution_id FROM action_executions ORDER BY started_at DESC LIMIT ?
         )`,
      )
      .run(HISTORY_LIMIT);
  }

  recent(limit = 100): unknown[] {
    return this.db.prepare("SELECT * FROM action_executions ORDER BY started_at DESC LIMIT ?").all(limit);
  }
}
