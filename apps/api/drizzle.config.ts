import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env["G6K4EVER_DB_URL"] ?? "./data/g6k4ever.db",
  },
  strict: true,
  verbose: true,
} satisfies Config;
