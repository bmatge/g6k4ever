import type { ApiDataSource, DatabaseDataSource } from "@g6k4ever/schema";
import type { ApiConnectionProvider, DatabaseConnectionProvider } from "./types.js";

/**
 * Provider `database` mocké — utile en tests et en dev sans vraies connexions.
 *
 * Enregistré par `connectionId`, sert des lignes statiques selon un matcher.
 * Pour la prod (Phase 5.3+), un provider réel exécutera la SQL via un pool
 * de connexions par `connectionId`.
 */
export class MockDatabaseProvider implements DatabaseConnectionProvider {
  private rows: Record<string, unknown>[] = [];
  private matcher: (row: Record<string, unknown>, params: Record<string, unknown>) => boolean = () =>
    true;

  /** Configure le jeu de lignes et la fonction de matching. */
  setData(
    rows: Record<string, unknown>[],
    matcher: (row: Record<string, unknown>, params: Record<string, unknown>) => boolean,
  ): this {
    this.rows = rows;
    this.matcher = matcher;
    return this;
  }

  query(
    _source: DatabaseDataSource,
    parameters: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const found = this.rows.find((row) => this.matcher(row, parameters));
    return found ?? null;
  }
}

/**
 * Provider `api` mocké — utile en tests et en dev sans appels HTTP réels.
 *
 * Sert des réponses pré-configurées selon les paramètres. Le cache est implicite
 * (pas d'appel réseau, donc TTL non pertinent ici).
 *
 * Pour la prod (Phase 5.3+), un provider réel fera des fetch HTTP avec cache
 * TTL respecté.
 */
export class MockApiProvider implements ApiConnectionProvider {
  private responses = new Map<string, Record<string, unknown>>();

  /**
   * Enregistre une réponse pour un jeu de paramètres donné. La clé est la
   * sérialisation déterministe des paramètres.
   */
  setResponse(parameters: Record<string, unknown>, response: Record<string, unknown>): this {
    this.responses.set(keyFor(parameters), response);
    return this;
  }

  call(_source: ApiDataSource, parameters: Record<string, unknown>): Record<string, unknown> | null {
    return this.responses.get(keyFor(parameters)) ?? null;
  }
}

function keyFor(parameters: Record<string, unknown>): string {
  const sorted = Object.keys(parameters)
    .sort()
    .map((k) => [k, parameters[k]] as const);
  return JSON.stringify(sorted);
}
