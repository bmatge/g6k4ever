import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const PORT = Number(process.env["PORT"] ?? 3000);

const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`[@g6k4ever/api] up on http://localhost:${info.port}`);
    // eslint-disable-next-line no-console
    console.log(`  GET  /healthz`);
    // eslint-disable-next-line no-console
    console.log(`  POST /run-stateless     body: { simulator, input }`);
  },
);
