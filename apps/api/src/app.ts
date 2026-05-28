import { Hono } from "hono";
import { Simulator } from "@g6k4ever/schema";
import { evaluate, type SimulatorState, type Notification } from "@g6k4ever/engine";
import { createStandardRegistry } from "@g6k4ever/functions";
import { createInlineResolver } from "./inline-resolver.js";

/**
 * Sérialise un `SimulatorState` (qui contient des `Map`) en objet JSON-able
 * avant la réponse.
 */
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

export interface ApiAppOptions {
  /**
   * Plafond d'itérations à passer au moteur. Par défaut 10 (cohérent avec
   * docs/analysis/decisions.md D1).
   */
  maxIterations?: number;
}

export function createApp(opts: ApiAppOptions = {}): Hono {
  const app = new Hono();
  const functions = createStandardRegistry();
  const maxIterations = opts.maxIterations ?? 10;

  /**
   * GET / — info & santé.
   */
  app.get("/", (c) =>
    c.json({
      name: "@g6k4ever/api",
      version: "0.0.0",
      phase: "5a — /run-stateless only (Phase 5.2 ajoutera la persistance)",
      endpoints: ["GET /", "GET /healthz", "POST /run-stateless"],
    }),
  );

  /**
   * GET /healthz — probe de santé.
   */
  app.get("/healthz", (c) => c.json({ status: "ok" }));

  /**
   * POST /run-stateless — évalue un simulateur SANS persistance.
   *
   * Body : { simulator: Simulator, input: SimulatorInput }
   * Réponse : { state: SimulatorState (sérialisé) } ou erreur 4xx avec détails.
   */
  app.post("/run-stateless", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Body JSON invalide" }, 400);
    }
    if (
      typeof body !== "object" ||
      body === null ||
      !("simulator" in body) ||
      !("input" in body)
    ) {
      return c.json({ error: "Body attendu : { simulator, input }" }, 400);
    }
    const { simulator: rawSim, input } = body as { simulator: unknown; input: unknown };

    const parsed = Simulator.safeParse(rawSim);
    if (!parsed.success) {
      return c.json(
        {
          error: "Simulateur invalide",
          details: parsed.error.format(),
        },
        400,
      );
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return c.json({ error: "input doit être un objet { dataName: value }" }, 400);
    }

    const datasources = createInlineResolver(parsed.data);
    try {
      const state = evaluate(parsed.data, input as Record<string, unknown>, {
        resolvers: { datasources },
        functions,
        maxIterations,
      });
      return c.json({ state: serializeState(state) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : "Error";
      return c.json({ error: message, name }, 422);
    }
  });

  return app;
}
