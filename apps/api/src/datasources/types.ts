import type { ApiDataSource, DatabaseDataSource } from "@g6k4ever/schema";

/**
 * Couche d'abstraction pour les datasources externes (`database`, `api`).
 *
 * Le moteur ne connaît qu'une `DataSourceResolver` synchrone. Les providers
 * ci-dessous sont composés par `MultiDataSourceResolver` qui choisit le bon
 * provider selon `sourceDef.kind`.
 *
 * Architecture :
 *   - les `inline` sources sont servies directement depuis la définition.
 *   - les `database` sources délèguent à un `DatabaseConnectionProvider`
 *     enregistré par `connectionId`. Le provider exécute la requête SQL
 *     paramétrée et renvoie 0 ou 1 ligne.
 *   - les `api` sources délèguent à un `ApiConnectionProvider` enregistré.
 *     Le provider gère son propre cache TTL.
 *
 * **Contrainte sync** : les providers s'exécutent en synchrone car le moteur
 * est sync. Pour les vrais providers HTTP (Phase 5.3+), on aura besoin de
 * pré-fetch async avant l'évaluation (`prefetch`) ou de bascule du moteur en
 * async. Pour le MVP, on traite chaque provider comme sync (better-sqlite3
 * est sync, et le provider API mocké est sync via cache pré-rempli).
 */

export interface DatabaseConnectionProvider {
  /**
   * Exécute la requête SQL de la source `database` avec les paramètres bornés
   * (issus du moteur). Renvoie une ligne (Record) ou `null` si pas de match.
   *
   * @param source     définition complète de la source.
   * @param parameters paramètres bornés (`{ insee: "75056" }` par exemple).
   */
  query(
    source: DatabaseDataSource,
    parameters: Record<string, unknown>,
  ): Record<string, unknown> | null;
}

export interface ApiConnectionProvider {
  /**
   * Appelle l'endpoint API (potentiellement caché) et renvoie la réponse
   * projetée via `source.returnPath` (si fourni). Renvoie `null` en cas
   * d'erreur ou de cache miss strict.
   *
   * @param source     définition complète de la source.
   * @param parameters paramètres bornés.
   */
  call(
    source: ApiDataSource,
    parameters: Record<string, unknown>,
  ): Record<string, unknown> | null;
}

/**
 * Registre des providers de connexions, indexés par `connectionId` (pour
 * `database`) ou par identifiant de provider (pour `api`).
 */
export interface ProviderRegistry {
  databases: Map<string, DatabaseConnectionProvider>;
  apis: Map<string, ApiConnectionProvider>;
}

export function emptyProviderRegistry(): ProviderRegistry {
  return { databases: new Map(), apis: new Map() };
}
