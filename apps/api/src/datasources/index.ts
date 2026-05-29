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
 * Phase 5.3 : ajout de `SqliteDatabaseProvider` et `HttpApiProvider` réels,
 * + config par variables d'environnement.
 */

export {
  type ApiConnectionProvider,
  type DatabaseConnectionProvider,
  type ProviderRegistry,
  emptyProviderRegistry,
} from "./types.js";
export { MockDatabaseProvider, MockApiProvider } from "./mock-providers.js";
export { MultiDataSourceResolver } from "./multi-resolver.js";
export { SqliteDatabaseProvider, compileQuery } from "./sqlite-provider.js";
export { HttpApiProvider } from "./http-provider.js";
export {
  loadConnectionConfigFromEnv,
  buildProviderRegistry,
  buildMockRegistry,
  type ConnectionConfig,
} from "./connection-config.js";
