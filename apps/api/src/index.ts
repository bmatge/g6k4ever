/**
 * @g6k4ever/api — API Hono + SQLite (better-sqlite3 + Drizzle).
 *
 * Phase 5.2 : persistance (CRUD simulators + lock + versions brouillon/publié)
 * + couche d'abstraction datasources (inline réelle, database/api via providers
 * branchables — mockés pour le MVP).
 *
 * Zéro logique métier — toute évaluation passe par @g6k4ever/engine (cf. CLAUDE.md §4).
 */

export const API_PACKAGE_VERSION = "0.0.0" as const;

export { createApp, type ApiAppOptions } from "./app.js";
export { createInlineResolver } from "./inline-resolver.js";
export { createDb, type Db, type DbOptions } from "./db/client.js";
export { runMigrations } from "./db/migrate.js";
export { SimulatorService } from "./services/simulator-service.js";
export { LockService, DEFAULT_LOCK_TTL_MS } from "./services/lock-service.js";
export {
  MultiDataSourceResolver,
  MockDatabaseProvider,
  MockApiProvider,
  emptyProviderRegistry,
  type ProviderRegistry,
  type DatabaseConnectionProvider,
  type ApiConnectionProvider,
} from "./datasources/index.js";
