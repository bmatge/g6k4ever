import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const PORT = Number(process.env["PORT"] ?? 3000);
const DB_URL = process.env["G6K4EVER_DB_URL"] ?? "./data/g6k4ever.db";

const { app, closeDb } = createApp({ dbUrl: DB_URL });

const server = serve(
  { fetch: app.fetch, port: PORT },
  (info) => {
    console.log(`[@g6k4ever/api] up on http://localhost:${info.port}`);
    console.log(`  DB    ${DB_URL}`);
    console.log(`  Routes : GET /, GET /healthz, GET/POST /simulators, ...`);
  },
);

const shutdown = (sig: string): void => {
  console.log(`[@g6k4ever/api] received ${sig}, shutting down...`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
