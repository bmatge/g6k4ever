import { serve } from "@hono/node-server";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadConnectionConfigFromEnv, buildProviderRegistry } from "./datasources/connection-config.js";
import { startLockPurgeJob } from "./services/lock-purge.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { SimulatorService } from "./services/simulator-service.js";
import { seedCorpus } from "./seed.js";

const PORT = Number(process.env["PORT"] ?? 3000);
const DB_URL = process.env["G6K4EVER_DB_URL"] ?? "./data/g6k4ever.db";
const SEED_CORPUS = process.env["G6K4EVER_SEED"] !== "false"; // default true

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CORPUS_DIR = resolve(REPO_ROOT, "_corpus", "portail-elec");
const SCHEMA_EXAMPLES_DIR = resolve(REPO_ROOT, "packages", "schema", "examples");

// Configuration des connexions externes depuis les env vars
//   G6K4EVER_DB_<connectionId>=sqlite:///abs/path.db[?rw=1]
//   G6K4EVER_API_LRU_MAX=500
const config = loadConnectionConfigFromEnv();
const { providers, close: closeProviders } = buildProviderRegistry(config);

const { db, raw } = createDb({ url: DB_URL });
runMigrations(raw);

const { app, closeDb } = createApp({ db, providers });

// Seed idempotent : pousse les simulateurs du corpus en DB s'ils n'existent pas
let seedSummary = "(seed désactivé)";
if (SEED_CORPUS) {
  const service = new SimulatorService(db);
  const result = seedCorpus(service, {
    directories: [CORPUS_DIR, SCHEMA_EXAMPLES_DIR],
    seedUser: "corpus-seed",
    log: (m) => console.log(m),
  });
  seedSummary = `créés=${result.created.length} (${result.created.join(", ") || "—"}), ignorés=${result.skipped.length}, erreurs=${result.errors.length}`;
  for (const err of result.errors) {
    console.warn(`[seed] ⚠ ${err.file}: ${err.error}`);
  }
}

// Job de purge des verrous expirés (5 min)
const stopPurge = startLockPurgeJob(db, { log: (m) => console.log(m) });

const server = serve(
  { fetch: app.fetch, port: PORT },
  (info) => {
    console.log(`[@g6k4ever/api] up on http://localhost:${info.port}`);
    console.log(`  DB         ${DB_URL}`);
    console.log(`  DB conn    ${Object.keys(config.databases).length} configurée(s)`);
    console.log(`  Seed       ${seedSummary}`);
    console.log(`  Lock purge enabled (5 min)`);
    console.log(`  Routes : GET /, GET /healthz, GET/POST /simulators, ...`);
  },
);

const shutdown = (sig: string): void => {
  console.log(`[@g6k4ever/api] received ${sig}, shutting down...`);
  stopPurge();
  server.close(() => {
    closeProviders();
    closeDb();
    raw.close();
    process.exit(0);
  });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
