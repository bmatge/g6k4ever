import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

export type Db = BetterSQLite3Database<typeof schema>;

export interface DbOptions {
  /** Chemin du fichier SQLite. `":memory:"` pour une base en RAM (tests). */
  url: string;
  /** Active le WAL — fortement recommandé pour la concurrence (cf. SQLite docs). */
  enableWal?: boolean;
}

/**
 * Crée une connexion DB. À appeler une fois au démarrage du serveur.
 *
 * Pour passer à PostgreSQL : remplacer cet appel par drizzle-orm/node-postgres
 * et adapter le schéma (compatible à 95% — quelques différences mineures sur
 * les types `INTEGER` AUTOINCREMENT vs `SERIAL`).
 */
export function createDb(options: DbOptions): { db: Db; raw: Database.Database } {
  if (options.url !== ":memory:") {
    mkdirSync(dirname(options.url), { recursive: true });
  }
  const raw = new Database(options.url);
  // Pragmas pour la perf et la robustesse — alignés sur les bonnes pratiques
  // production better-sqlite3 (cf. https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md).
  if (options.enableWal !== false && options.url !== ":memory:") {
    raw.pragma("journal_mode = WAL");
  }
  raw.pragma("foreign_keys = ON");
  raw.pragma("synchronous = NORMAL");
  raw.pragma("busy_timeout = 5000");
  raw.pragma("cache_size = -64000"); // 64 MB cache (négatif = KB)
  raw.pragma("temp_store = MEMORY");

  const db = drizzle(raw, { schema });
  return { db, raw };
}
