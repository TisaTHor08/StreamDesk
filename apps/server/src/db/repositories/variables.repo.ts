import type Database from "better-sqlite3";
import type { InteractionVariable } from "@streamdesk/shared-types";

type Row = {
  id: string;
  name: string;
  initial_value: string;
  current_value: string;
  created_at: string;
  updated_at: string;
};

function rowToVariable(row: Row): InteractionVariable {
  return {
    id: row.id,
    name: row.name,
    initialValue: JSON.parse(row.initial_value) as InteractionVariable["initialValue"],
    currentValue: JSON.parse(row.current_value) as InteractionVariable["currentValue"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Backing store for interaction-script variables (see InteractionEngine). */
export class VariablesRepository {
  constructor(private readonly db: Database.Database) {}

  list(): InteractionVariable[] {
    return (this.db.prepare("SELECT * FROM variables ORDER BY created_at ASC").all() as Row[]).map(rowToVariable);
  }

  getById(id: string): InteractionVariable | null {
    const row = this.db.prepare("SELECT * FROM variables WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToVariable(row) : null;
  }

  create(variable: InteractionVariable): void {
    this.db
      .prepare(
        `INSERT INTO variables (id, name, initial_value, current_value, created_at, updated_at)
         VALUES (@id, @name, @initial_value, @current_value, @created_at, @updated_at)`,
      )
      .run({
        id: variable.id,
        name: variable.name,
        initial_value: JSON.stringify(variable.initialValue),
        current_value: JSON.stringify(variable.currentValue),
        created_at: variable.createdAt,
        updated_at: variable.updatedAt,
      });
  }

  /** Renames and/or changes the initial value (definition-level fields only — use `setValue` for the live value). */
  update(id: string, patch: { name?: string; initialValue?: InteractionVariable["initialValue"] }): void {
    const existing = this.getById(id);
    if (!existing) return;
    const next: InteractionVariable = {
      ...existing,
      name: patch.name ?? existing.name,
      initialValue: patch.initialValue ?? existing.initialValue,
      updatedAt: new Date().toISOString(),
    };
    this.db
      .prepare("UPDATE variables SET name = ?, initial_value = ?, updated_at = ? WHERE id = ?")
      .run(next.name, JSON.stringify(next.initialValue), next.updatedAt, id);
  }

  /** Sets the live value — called both by admin edits and by `setVariable`/`changeVariable` interaction blocks. */
  setValue(id: string, value: InteractionVariable["currentValue"]): void {
    this.db
      .prepare("UPDATE variables SET current_value = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(value), new Date().toISOString(), id);
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM variables WHERE id = ?").run(id);
  }
}
