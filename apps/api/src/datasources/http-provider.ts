import type { ApiDataSource } from "@g6k4ever/schema";
import type { ApiConnectionProvider } from "./types.js";

interface CacheEntry {
  value: Record<string, unknown> | null;
  expiresAt: number;
}

/**
 * Provider `api` réel : fait des appels HTTP avec un cache LRU borné et
 * respect du TTL déclaré par la source.
 *
 * **Synchrone par contrainte** : le moteur exécute `resolve()` en synchrone,
 * mais un fetch HTTP est async. On contourne via un **cache pré-rempli** :
 *
 *   1. Le caller peut warm-up le cache en appelant `prefetch(source, params)`
 *      avant d'évaluer un simulateur (sera async).
 *   2. Au moment du `call()` synchrone, on retourne la valeur cachée si dispo,
 *      sinon `null` (et on déclenche un fetch en arrière-plan pour le prochain
 *      appel).
 *
 * Pour Phase 5.3, on offre les deux modes :
 *   - `prefetch()` → async, fait l'appel et populate le cache
 *   - `call()` → sync, lit le cache
 *
 * Un usage typique côté API : avant d'appeler le moteur sur un simulateur,
 * walker `simulator.sources` de kind `api`, appeler `prefetch` pour chaque
 * (avec params dérivés des Data déjà connues, ou échantillonnage standard).
 *
 * **Limitation Phase 5.3** : le `prefetch` couvre un seul jeu de params à la
 * fois. Pour un vrai prefetch « à la volée pendant l'évaluation », il faudrait
 * basculer le moteur en async (refactor non trivial, post-MVP).
 */
export class HttpApiProvider implements ApiConnectionProvider {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;

  constructor(options: { maxEntries?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 500;
  }

  /**
   * Appel synchrone : retourne la valeur cachée ou `null`.
   */
  call(
    source: ApiDataSource,
    parameters: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const key = cacheKey(source.id, parameters);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // LRU touch : reinsert en queue
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Pré-fetch asynchrone : fait l'appel HTTP, populate le cache.
   * Respecte le TTL de la source (0 = pas de cache → toujours hit network).
   */
  async prefetch(
    source: ApiDataSource,
    parameters: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const ttlMs = source.cacheTTLSeconds * 1000;
    const key = cacheKey(source.id, parameters);
    if (ttlMs > 0) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt >= Date.now()) return cached.value;
    }

    const value = await this.doFetch(source, parameters);

    if (ttlMs > 0) {
      if (this.cache.size >= this.maxEntries) {
        // LRU eviction : remove oldest (premier inséré).
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    return value;
  }

  /** Vide le cache (utile en tests ou à la publication). */
  invalidate(): void {
    this.cache.clear();
  }

  private async doFetch(
    source: ApiDataSource,
    parameters: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const url = source.method === "GET" ? buildGetUrl(source.uri, parameters) : source.uri;
    const init: RequestInit = {
      method: source.method,
      headers: { Accept: "application/json" },
    };
    if (source.method === "POST") {
      init.headers = { ...init.headers, "Content-Type": "application/json" };
      init.body = JSON.stringify(parameters);
    }
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const raw = (await res.json().catch(() => null)) as unknown;
    if (raw === null) return null;
    return projectReturnPath(raw, source.returnPath);
  }
}

function cacheKey(sourceId: string, parameters: Record<string, unknown>): string {
  const sorted = Object.keys(parameters)
    .sort()
    .map((k) => [k, parameters[k]] as const);
  return `${sourceId}|${JSON.stringify(sorted)}`;
}

function buildGetUrl(uri: string, parameters: Record<string, unknown>): string {
  const url = new URL(uri);
  for (const [k, v] of Object.entries(parameters)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Projette une chaîne JSONPath simple (sous-ensemble : `a.b.c` ou `a.0.b`).
 * Le périmètre G6K reste simple ; un vrai JSONPath sera ajouté en post-MVP
 * si le corpus le justifie.
 */
function projectReturnPath(raw: unknown, path: string | undefined): Record<string, unknown> | null {
  if (!path) {
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
    return { value: raw };
  }
  let current: unknown = raw;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return null;
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (!Number.isInteger(idx)) return null;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  if (typeof current === "object" && current !== null && !Array.isArray(current)) {
    return current as Record<string, unknown>;
  }
  return { value: current };
}
