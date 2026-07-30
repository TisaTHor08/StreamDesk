import Database from "better-sqlite3";
import type { Logger } from "../logging/logger.js";
import { runMigrations } from "./migrate.js";

export function openDatabase(dbPath: string, logger: Logger): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db, logger);
  return db;
}
