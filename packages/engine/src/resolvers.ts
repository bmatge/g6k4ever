import type { DataSourceResolver } from "./types.js";

/**
 * Résolveur en mémoire pour les datasources `inline`, et utile dans les tests
 * comme stub pour `database` et `api`.
 *
 * Indexé par sourceId. Pour chaque source, on stocke une liste de lignes et
 * une fonction de matching qui filtre selon les paramètres.
 */
export class InMemoryDataSource implements DataSourceResolver {
  private tables = new Map<
    string,
    {
      rows: Record<string, unknown>[];
      match: (row: Record<string, unknown>, params: Record<string, unknown>) => boolean;
    }
  >();

  /**
   * Enregistre une table en mémoire pour un id de source donné.
   *
   * @param sourceId  l'id de la source telle que déclarée dans le simulateur.
   * @param rows      les lignes de données.
   * @param match     prédicat de matching ; reçoit une ligne et le dict de params,
   *                  retourne `true` si la ligne convient.
   */
  register(
    sourceId: string,
    rows: Record<string, unknown>[],
    match: (row: Record<string, unknown>, params: Record<string, unknown>) => boolean,
  ): void {
    this.tables.set(sourceId, { rows, match });
  }

  resolve(sourceId: string, parameters: Record<string, unknown>): Record<string, unknown> | null {
    const table = this.tables.get(sourceId);
    if (!table) return null;
    const matched = table.rows.find((row) => table.match(row, parameters));
    return matched ?? null;
  }
}
