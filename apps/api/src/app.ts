import { Hono } from "hono";
import { cors } from "hono/cors";
import { Simulator } from "@g6k4ever/schema";
import {
  evaluate,
  type SimulatorState,
  type Notification,
  type FunctionRegistry,
} from "@g6k4ever/engine";
import { createStandardRegistry } from "@g6k4ever/functions";
import { createDb, type Db } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { MultiDataSourceResolver } from "./datasources/multi-resolver.js";
import { emptyProviderRegistry, type ProviderRegistry } from "./datasources/types.js";
import { SimulatorService } from "./services/simulator-service.js";
import { LockService } from "./services/lock-service.js";
import { simulatorsRoutes } from "./routes/simulators.js";
import { lockRoutes } from "./routes/lock.js";
import { runRoutes } from "./routes/run.js";

export interface ApiAppOptions {
  dbUrl?: string;
  maxIterations?: number;
  providers?: ProviderRegistry;
  functions?: FunctionRegistry;
  /** Injection d'un Db pré-créé (utile en tests `:memory:`). */
  db?: Db;
}

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

/**
 * Compose l'application Hono complète.
 *
 * Wiring :
 *   /                                  identité
 *   /healthz                           probe
 *   /simulators                        GET / POST
 *   /simulators/:slug                  GET / PUT / DELETE
 *   /simulators/:slug/publish          POST
 *   /simulators/:slug/lock             POST / DELETE / POST /heartbeat
 *   /simulators/:slug/run              POST  (utilise la définition stockée)
 *   /run-stateless                     POST  (utilise une définition fournie en body)
 */
export function createApp(opts: ApiAppOptions = {}): {
  app: Hono;
  closeDb: () => void;
} {
  const providers = opts.providers ?? emptyProviderRegistry();
  const functions = opts.functions ?? createStandardRegistry();
  const maxIterations = opts.maxIterations ?? 10;

  let db: Db;
  let closeDb: () => void = () => undefined;
  if (opts.db) {
    db = opts.db;
  } else {
    const created = createDb({ url: opts.dbUrl ?? "./data/g6k4ever.db" });
    runMigrations(created.raw);
    db = created.db;
    closeDb = () => created.raw.close();
  }

  const simulatorService = new SimulatorService(db);
  const lockService = new LockService(db);

  const app = new Hono();

  // CORS ouvert pour le dev (éditeur sur :5174 → API sur :3000). En prod,
  // restreindre via une env var et passer une liste d'origines autorisées.
  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-User-Id"],
      exposeHeaders: ["Content-Type"],
      credentials: true,
    }),
  );

  app.get("/", (c) =>
    c.json({
      name: "@g6k4ever/api",
      version: "0.0.0",
      phase: "5.2 — persistance + datasources abstraites",
      endpoints: [
        "GET /",
        "GET /healthz",
        "GET /simulators",
        "POST /simulators",
        "GET /simulators/:slug",
        "PUT /simulators/:slug",
        "DELETE /simulators/:slug",
        "POST /simulators/:slug/publish",
        "POST /simulators/:slug/lock",
        "POST /simulators/:slug/lock/heartbeat",
        "DELETE /simulators/:slug/lock",
        "POST /simulators/:slug/run",
        "POST /run-stateless",
      ],
    }),
  );

  app.get("/healthz", (c) => c.json({ status: "ok" }));

  /**
   * POST /run-stateless — évaluation sans persistance (Phase 5a).
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
      return c.json({ error: "Simulateur invalide", details: parsed.error.format() }, 400);
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return c.json({ error: "input doit être un objet { dataName: value }" }, 400);
    }
    const resolver = new MultiDataSourceResolver(parsed.data, providers);
    try {
      const state = evaluate(parsed.data, input as Record<string, unknown>, {
        resolvers: { datasources: resolver },
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

  // CRUD + lock + run sous /simulators.
  app.route("/simulators", simulatorsRoutes(simulatorService, lockService));
  app.route("/simulators", lockRoutes(lockService));
  app.route(
    "/simulators",
    runRoutes({ service: simulatorService, providers, functions, maxIterations }),
  );

  return { app, closeDb };
}
