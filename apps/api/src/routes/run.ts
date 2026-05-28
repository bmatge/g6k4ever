import { Hono } from "hono";
import { evaluate, type Notification, type SimulatorState } from "@g6k4ever/engine";
import type { FunctionRegistry } from "@g6k4ever/engine";
import type { SimulatorService } from "../services/simulator-service.js";
import { MultiDataSourceResolver } from "../datasources/multi-resolver.js";
import type { ProviderRegistry } from "../datasources/types.js";

function serializeState(state: SimulatorState): {
  values: Record<string, unknown>;
  visibility: Record<string, boolean>;
  notifications: Notification[];
  stable: boolean;
  iterations: number;
} {
  return {
    values: Object.fromEntries(state.values),
    visibility: Object.fromEntries(state.visibility),
    notifications: state.notifications,
    stable: state.stable,
    iterations: state.iterations,
  };
}

export interface RunRoutesDeps {
  service: SimulatorService;
  providers: ProviderRegistry;
  functions: FunctionRegistry;
  maxIterations?: number;
}

export function runRoutes(deps: RunRoutesDeps): Hono {
  const app = new Hono();
  const maxIterations = deps.maxIterations ?? 10;

  /**
   * POST /simulators/:slug/run?version=draft|published — évalue le simulateur
   * persisté avec un body `{ input }`.
   */
  app.post("/:slug/run", async (c) => {
    const slug = c.req.param("slug");
    const version = c.req.query("version") === "published" ? "published" : "draft";
    const detail = deps.service.getBySlug(slug);
    if (!detail) return c.json({ error: "not-found" }, 404);
    const definition =
      version === "published" ? detail.publishedDefinition : detail.draftDefinition;
    if (!definition) {
      return c.json({ error: "Aucune version publiée pour ce simulateur." }, 404);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Body JSON invalide. Attendu : { input: {...} }" }, 400);
    }
    const input =
      typeof body === "object" && body !== null && "input" in body
        ? (body as { input: unknown }).input
        : null;
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return c.json({ error: "Body.input doit être un objet { dataName: value }" }, 400);
    }

    const resolver = new MultiDataSourceResolver(definition, deps.providers);
    try {
      const state = evaluate(definition, input as Record<string, unknown>, {
        resolvers: { datasources: resolver },
        functions: deps.functions,
        maxIterations,
      });
      return c.json({ state: serializeState(state), version });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : "Error";
      return c.json({ error: message, name }, 422);
    }
  });

  return app;
}
