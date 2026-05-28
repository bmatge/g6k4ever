import type Database from "better-sqlite3";

/**
 * Migrations SQL en dur. Pour les déploiements de prod on bascule sur
 * `drizzle-kit generate` + `drizzle/migrator`, mais pour le MVP ça suffit
 * largement et reste explicite.
 *
 * Chaque migration s'exécute sous transaction. La table `_migrations` garantit
 * l'idempotence.
 */
const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: "001-initial",
    sql: `
      CREATE TABLE IF NOT EXISTS simulators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        draft_definition TEXT NOT NULL,
        published_definition TEXT,
        schema_version INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        created_by TEXT,
        updated_by TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_simulators_updated_at ON simulators(updated_at);

      CREATE TABLE IF NOT EXISTS locks (
        simulator_id INTEGER PRIMARY KEY,
        user_id TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (simulator_id) REFERENCES simulators(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_locks_expires_at ON locks(expires_at);
    `,
  },
];

export function runMigrations(raw: Database.Database): void {
  raw.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);
  const applied = new Set(
    raw
      .prepare("SELECT id FROM _migrations")
      .all()
      .map((row) => (row as { id: string }).id),
  );
  const insert = raw.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)");
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const tx = raw.transaction(() => {
      raw.exec(m.sql);
      insert.run(m.id, Date.now());
    });
    tx();
  }
}
