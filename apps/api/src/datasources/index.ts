/**
 * Couche d'abstraction des datasources externes.
 *
 * Architecture :
 *   - `MultiDataSourceResolver` est consommé par le moteur. Il dispatche selon
 *     `sourceDef.kind` vers le bon provider.
 *   - Les providers `database` et `api` sont enregistrés dans un `ProviderRegistry`
 *     passé à la construction. Les `inline` sources sont servies directement
 *     depuis la définition du simulateur.
 *
 * Pour la prod (Phase 5.3+), remplacer `MockDatabaseProvider` / `MockApiProvider`
 * par des implémentations réelles (pool de connexions SQL, client HTTP avec cache).
 */

export {
  type ApiConnectionProvider,
  type DatabaseConnectionProvider,
  type ProviderRegistry,
  emptyProviderRegistry,
} from "./types.js";
export { MockDatabaseProvider, MockApiProvider } from "./mock-providers.js";
export { MultiDataSourceResolver } from "./multi-resolver.js";
