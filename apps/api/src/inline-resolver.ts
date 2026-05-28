import type { Simulator } from "@g6k4ever/schema";
import type { DataSourceResolver } from "@g6k4ever/engine";

/**
 * Construit un `DataSourceResolver` qui sert exclusivement les sources `inline`
 * d'une définition de simulateur.
 *
 * Les sources `database` et `api` retournent `null` — leur résolution nécessite
 * une connexion externe que l'API expose plus tard (Phase 5.2). Pour le MVP, les
 * simulateurs testables via cette API doivent utiliser uniquement des sources
 * `inline` (avec rows embarqués).
 *
 * Pour matcher une ligne contre des paramètres : on compare le paramètre `name`
 * à la colonne du même nom dans la ligne. Logique simple suffisant pour le MVP.
 */
export function createInlineResolver(simulator: Simulator): DataSourceResolver {
  const tables = new Map<string, { rows: Array<Record<string, unknown>> }>();
  for (const source of simulator.sources) {
    if (source.kind === "inline") {
      tables.set(source.id, { rows: source.rows });
    }
  }

  return {
    resolve(sourceId: string, parameters: Record<string, unknown>): Record<string, unknown> | null {
      const table = tables.get(sourceId);
      if (!table) return null;
      const match = table.rows.find((row) =>
        Object.entries(parameters).every(
          ([key, value]) => row[key] === value || String(row[key]) === String(value),
        ),
      );
      return match ?? null;
    },
  };
}
