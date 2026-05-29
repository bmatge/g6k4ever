import { SqliteDatabaseProvider } from "./sqlite-provider.js";
import { HttpApiProvider } from "./http-provider.js";
import { MockDatabaseProvider, MockApiProvider } from "./mock-providers.js";
import { emptyProviderRegistry, type ProviderRegistry } from "./types.js";

/**
 * Configuration des connexions externes pour les datasources `database`/`api`.
 *
 * Pour la prod, on charge depuis les variables d'environnement :
 *
 *   G6K4EVER_DB_<connectionId>=sqlite:///path/to/db.sqlite
 *   G6K4EVER_API_LRU_MAX=500  (default 500)
 *
 * Format de l'URL DB :
 *   sqlite:///absolute/path.db          → SqliteDatabaseProvider (readOnly par défaut)
 *   sqlite:///absolute/path.db?rw=1     → SqliteDatabaseProvider en lecture/écriture
 *   mock://                              → MockDatabaseProvider (tests/dev)
 *
 * Pour les API, un seul `HttpApiProvider` partagé est registré pour toutes les
 * sources `api` — chacune apporte son URI et son TTL.
 */

export interface ConnectionConfig {
  databases: Record<string, string>;
  apiCacheMaxEntries?: number;
}

/**
 * Charge la config depuis `process.env`.
 *
 * Toute variable `G6K4EVER_DB_xxx` devient une connexion DB sous le clé `xxx`.
 */
export function loadConnectionConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ConnectionConfig {
  const databases: Record<string, string> = {};
  const prefix = "G6K4EVER_DB_";
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(prefix) && value) {
      const id = key.slice(prefix.length).toLowerCase().replace(/_/g, "-");
      databases[id] = value;
    }
  }
  const apiCacheMaxEntries = env["G6K4EVER_API_LRU_MAX"]
    ? Number.parseInt(env["G6K4EVER_API_LRU_MAX"], 10)
    : undefined;
  return { databases, apiCacheMaxEntries };
}

/**
 * Construit un `ProviderRegistry` à partir de la config.
 *
 * Le HttpApiProvider est partagé pour toutes les sources `api` — chaque
 * source (par son `id`) y est mappée.
 *
 * Retourne aussi la fonction `close` qui ferme les connexions DB ouvertes,
 * à appeler au shutdown du serveur.
 */
export function buildProviderRegistry(
  config: ConnectionConfig,
  apiSourceIds: string[] = [],
): { providers: ProviderRegistry; close: () => void } {
  const providers = emptyProviderRegistry();
  const dbProviders: SqliteDatabaseProvider[] = [];

  for (const [connectionId, url] of Object.entries(config.databases)) {
    if (url.startsWith("sqlite://")) {
      const cleanedUrl = url.slice("sqlite://".length);
      const [path, query] = cleanedUrl.split("?");
      const params = new URLSearchParams(query ?? "");
      const readOnly = params.get("rw") !== "1";
      const provider = new SqliteDatabaseProvider(path ?? ":memory:", { readOnly });
      providers.databases.set(connectionId, provider);
      dbProviders.push(provider);
    } else if (url.startsWith("mock://")) {
      providers.databases.set(connectionId, new MockDatabaseProvider());
    } else {
      throw new Error(`Connexion DB ${connectionId} : URL non supportée "${url}" (sqlite:// ou mock://)`);
    }
  }

  // Un seul HttpApiProvider partagé pour tous les `api.*` (le cache fonctionne
  // par (sourceId, params) donc le partage est sûr).
  const apiProvider = new HttpApiProvider({ maxEntries: config.apiCacheMaxEntries });
  for (const id of apiSourceIds) {
    providers.apis.set(id, apiProvider);
  }

  // Pour le dev/test, si aucun source api n'est connu à l'amorçage, on enregistre
  // quand même un provider "default" accessible via une clé conventionnée.
  if (apiSourceIds.length === 0) {
    // Pas de pré-enregistrement — les sources doivent être déclarées à l'amorçage.
  }

  return {
    providers,
    close: () => {
      for (const p of dbProviders) p.close();
    },
  };
}

/**
 * Helper pour les tests : config "all-mock" sans variables d'env.
 */
export function buildMockRegistry(): { providers: ProviderRegistry; close: () => void } {
  const providers = emptyProviderRegistry();
  // L'appelant ajoute ses MockDatabaseProvider / MockApiProvider selon besoin.
  return { providers, close: () => undefined };
}

export { MockDatabaseProvider, MockApiProvider };
