/**
 * @g6k4ever/api — API Hono + (futur) SQLite.
 *
 * Phase 5a (en cours) : POST /run-stateless — évaluation sans persistance.
 * Phase 5.2 (à venir) : CRUD simulators + lock + versions + export, avec DB driver à arrêter
 * (SQLite brut / Drizzle / Prisma — décision en attente).
 *
 * Zéro logique métier — tout passe par @g6k4ever/engine (cf. CLAUDE.md §4).
 */

export const API_PACKAGE_VERSION = "0.0.0" as const;

export { createApp, type ApiAppOptions } from "./app.js";
export { createInlineResolver } from "./inline-resolver.js";
