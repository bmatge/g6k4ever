import Database from "better-sqlite3";
import type { DatabaseDataSource } from "@g6k4ever/schema";
import type { DatabaseConnectionProvider } from "./types.js";

/**
 * Provider `database` SQLite via better-sqlite3.
 *
 * Reçoit une URL (chemin fichier) à la construction et expose un pool de
 * statements préparés cachés par requête SQL — significativement plus rapide
 * sur des appels répétés que la préparation à chaque requête.
 *
 * Sécurité :
 *   - La requête est paramétrée. La conversion des placeholders G6K
 *     `%1$s`/`%2$d` etc. → placeholders `?` SQLite se fait à la volée et
 *     dans l'ordre des `parameters.position`.
 *   - Les valeurs sont passées en bind params (jamais d'interpolation).
 *
 * Restriction MVP : on retourne la **première ligne** match (cohérent avec
 * le contrat `DataSourceResolver.resolve` qui retourne 0 ou 1 ligne).
 */
export class SqliteDatabaseProvider implements DatabaseConnectionProvider {
  private readonly db: Database.Database;
  private readonly stmts = new Map<string, Database.Statement>();

  constructor(readonly url: string, options: { readOnly?: boolean } = {}) {
    const readOnly = options.readOnly ?? true;
    this.db = new Database(url, {
      readonly: readOnly,
      fileMustExist: false,
    });
    // WAL et synchronous nécessitent write access → seulement en mode rw.
    if (!readOnly) {
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
    }
    this.db.pragma("cache_size = -32000");
  }

  /** Ferme la connexion. À appeler à l'arrêt du serveur. */
  close(): void {
    this.db.close();
  }

  query(
    source: DatabaseDataSource,
    parameters: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const { sql, bindValues } = compileQuery(source, parameters);
    let stmt = this.stmts.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.stmts.set(sql, stmt);
    }
    const row = stmt.get(...bindValues) as Record<string, unknown> | undefined;
    return row ?? null;
  }
}

/**
 * Convertit une requête G6K `SELECT … WHERE x = %1$s AND y = %2$d` en SQL
 * SQLite `SELECT … WHERE x = ? AND y = ?` avec la liste ordonnée de valeurs
 * à binder.
 *
 * - `%N$s` / `%N$d` → `?` (N indique la position, 1-indexed).
 * - On supporte aussi `?` direct (SQLite natif) si le power user préfère.
 */
export function compileQuery(
  source: DatabaseDataSource,
  parameters: Record<string, unknown>,
): { sql: string; bindValues: unknown[] } {
  // Index des paramètres par position.
  const byPosition = new Map<number, { name: string }>();
  for (const p of source.parameters) {
    if (p.position !== undefined) byPosition.set(p.position, { name: p.name });
  }

  const bindValues: unknown[] = [];
  const re = /%(\d+)\$[sd]/g;

  const sql = source.query.replace(re, (_match, posStr: string) => {
    const pos = Number(posStr);
    const meta = byPosition.get(pos);
    if (!meta) {
      throw new Error(
        `Source ${source.id} : placeholder %${pos}$ sans paramètre déclaré à la position ${pos}.`,
      );
    }
    bindValues.push(parameters[meta.name] ?? null);
    return "?";
  });

  // Si la query ne contient pas de placeholders nommés, on injecte les
  // paramètres dans l'ordre déclaré (fallback pour les `?` natifs).
  if (bindValues.length === 0 && /\?/.test(sql)) {
    for (const p of source.parameters) {
      bindValues.push(parameters[p.name] ?? null);
    }
  }

  return { sql, bindValues };
}
