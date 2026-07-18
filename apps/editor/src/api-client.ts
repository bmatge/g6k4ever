import type { Simulator } from "@g6k4ever/schema";

/**
 * Client HTTP pour `@g6k4ever/api`. Toutes les méthodes sont async et
 * renvoient le payload typé, ou lancent une `ApiError` en cas d'échec.
 */

export interface SimulatorSummary {
  id: number;
  slug: string;
  label: string;
  schemaVersion: number;
  hasPublished: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SimulatorDetail extends SimulatorSummary {
  draftDefinition: Simulator;
  publishedDefinition: Simulator | null;
}

export interface LockInfo {
  simulatorId: number;
  userId: string;
  acquiredAt: number;
  expiresAt: number;
}

/**
 * Résultat structuré d'une opération sur le verrou d'édition (F9.5).
 * `held-by-other` est un état métier normal (renvoyé en HTTP 423 par l'API),
 * PAS une erreur : il est retourné, jamais levé.
 */
export type LockAcquireResult =
  | { status: "acquired"; lock: LockInfo }
  | { status: "held-by-other"; heldBy: string; expiresAt: number };

export type LockHeartbeatResult =
  | { status: "renewed"; lock: LockInfo }
  | { status: "held-by-other"; heldBy: string; expiresAt: number };

export type LockReleaseResult =
  | { status: "released" }
  | { status: "not-locked" }
  | { status: "held-by-other"; heldBy: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  userId: string;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly userId: string;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl ?? "http://localhost:3000";
    this.userId = opts.userId;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    opts: { acceptStatuses?: number[] } = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": this.userId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return undefined as T;
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok && !(opts.acceptStatuses ?? []).includes(res.status)) {
      const message =
        json && typeof json === "object" && "error" in json
          ? String((json as { error: unknown }).error)
          : `Erreur HTTP ${res.status}`;
      throw new ApiError(res.status, message, json);
    }
    return json as T;
  }

  // Simulators
  list(): Promise<{ simulators: SimulatorSummary[] }> {
    return this.request("GET", "/simulators");
  }

  get(slug: string): Promise<{ simulator: SimulatorDetail }> {
    return this.request("GET", `/simulators/${slug}`);
  }

  create(definition: Simulator): Promise<{ simulator: SimulatorDetail }> {
    return this.request("POST", "/simulators", definition);
  }

  update(slug: string, definition: Simulator): Promise<{ simulator: SimulatorDetail }> {
    return this.request("PUT", `/simulators/${slug}`, definition);
  }

  delete(slug: string): Promise<void> {
    return this.request("DELETE", `/simulators/${slug}`);
  }

  publish(slug: string): Promise<{ simulator: SimulatorDetail }> {
    return this.request("POST", `/simulators/${slug}/publish`);
  }

  // Lock
  //
  // L'API répond 423 (Locked) quand le verrou est détenu par quelqu'un d'autre.
  // Côté client c'est un état métier, pas une erreur : ces méthodes renvoient
  // un statut structuré au lieu de lever une `ApiError` (F9.5). Les autres
  // erreurs HTTP (401, 404, …) continuent de lever une `ApiError`.
  acquireLock(slug: string, force = false): Promise<LockAcquireResult> {
    return this.request("POST", `/simulators/${slug}/lock${force ? "?force=true" : ""}`, undefined, {
      acceptStatuses: [423],
    });
  }

  heartbeatLock(slug: string): Promise<LockHeartbeatResult> {
    return this.request("POST", `/simulators/${slug}/lock/heartbeat`, undefined, {
      acceptStatuses: [423],
    });
  }

  releaseLock(slug: string, force = false): Promise<LockReleaseResult> {
    return this.request("DELETE", `/simulators/${slug}/lock${force ? "?force=true" : ""}`, undefined, {
      acceptStatuses: [423],
    });
  }

  // Run
  run(slug: string, input: Record<string, unknown>): Promise<{ state: unknown }> {
    return this.request("POST", `/simulators/${slug}/run`, { input });
  }

  /**
   * Évalue un simulateur fourni en body, sans persistance. Utilisé par la
   * preview de l'éditeur — bénéficie des `database`/`api` providers du backend.
   */
  runStateless(
    simulator: Simulator,
    input: Record<string, unknown>,
  ): Promise<{ state: SerializedSimulatorState }> {
    return this.request("POST", "/run-stateless", { simulator, input });
  }
}

/**
 * Sérialisation de `SimulatorState` reçue de l'API (les Map sont des Records).
 */
export interface SerializedSimulatorState {
  values: Record<string, unknown>;
  visibility: Record<string, boolean>;
  notifications: Array<{
    level: "error" | "warning";
    message: string;
    targetType: "data" | "step";
    targetId: string | number;
  }>;
  stable: boolean;
  iterations: number;
}
