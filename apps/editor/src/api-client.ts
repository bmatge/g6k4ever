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
    if (!res.ok) {
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
  acquireLock(slug: string, force = false): Promise<{ status: string; lock?: LockInfo; heldBy?: string }> {
    return this.request("POST", `/simulators/${slug}/lock${force ? "?force=true" : ""}`);
  }

  heartbeatLock(slug: string): Promise<{ status: string; lock?: LockInfo }> {
    return this.request("POST", `/simulators/${slug}/lock/heartbeat`);
  }

  releaseLock(slug: string, force = false): Promise<{ status: string }> {
    return this.request("DELETE", `/simulators/${slug}/lock${force ? "?force=true" : ""}`);
  }

  // Run
  run(slug: string, input: Record<string, unknown>): Promise<{ state: unknown }> {
    return this.request("POST", `/simulators/${slug}/run`, { input });
  }
}
