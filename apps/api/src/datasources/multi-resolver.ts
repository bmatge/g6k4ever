import type { Simulator } from "@g6k4ever/schema";
import type { DataSourceResolver } from "@g6k4ever/engine";
import type { ProviderRegistry } from "./types.js";

/**
 * Dispatcher de datasources. Construit pour un simulateur donné et son registre
 * de providers, expose la `resolve()` synchrone consommée par le moteur.
 *
 * - `inline` : lit `rows` de la définition, matche selon les paramètres
 *   (égalité stricte ou loose).
 * - `database` : délègue au provider enregistré sous `connectionId`.
 * - `api` : délègue au provider enregistré sous l'id de la source (clé
 *   conventionnée = `source.id` pour le MVP — pourra évoluer).
 *
 * Si un provider n'est pas enregistré (ex. `database` sans `MockDatabaseProvider`
 * branché), retourne `null` plutôt que de lever — le moteur traite alors la
 * Data comme indéfinie, ce qui propage naturellement les conditions `blank`.
 */
export class MultiDataSourceResolver implements DataSourceResolver {
  private inlineTables = new Map<string, { rows: Record<string, unknown>[] }>();

  constructor(
    private readonly simulator: Simulator,
    private readonly providers: ProviderRegistry,
  ) {
    for (const source of simulator.sources) {
      if (source.kind === "inline") {
        this.inlineTables.set(source.id, { rows: source.rows });
      }
    }
  }

  resolve(sourceId: string, parameters: Record<string, unknown>): Record<string, unknown> | null {
    const sourceDef = this.simulator.sources.find((s) => s.id === sourceId);
    if (!sourceDef) return null;

    switch (sourceDef.kind) {
      case "inline": {
        const table = this.inlineTables.get(sourceId);
        if (!table) return null;
        // Matche si toutes les paires param→colonne s'accordent (loose : compare
        // les chaînes pour tolérer les types mixtes des JSON).
        const found = table.rows.find((row) =>
          Object.entries(parameters).every(
            ([key, value]) => row[key] === value || String(row[key]) === String(value),
          ),
        );
        return found ?? null;
      }
      case "database": {
        const provider = this.providers.databases.get(sourceDef.connectionId);
        if (!provider) return null;
        return provider.query(sourceDef, parameters);
      }
      case "api": {
        const provider = this.providers.apis.get(sourceDef.id);
        if (!provider) return null;
        return provider.call(sourceDef, parameters);
      }
    }
  }
}
