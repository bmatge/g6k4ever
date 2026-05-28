import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

/**
 * Table `simulators` — définitions de simulateurs.
 *
 * - `draft_definition` : version brouillon (toujours présente).
 * - `published_definition` : version publiée (nullable jusqu'à la 1re publication).
 * - `slug` : identifiant lisible utilisé dans les URLs (`/simulators/:slug`).
 * - Timestamps en `INTEGER` (epoch ms) — supporté nativement par SQLite et
 *   trivial à indexer.
 *
 * Index sur `updated_at` pour les pagina (« derniers modifiés »).
 */
export const simulators = sqliteTable(
  "simulators",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    draftDefinition: text("draft_definition").notNull(),
    publishedDefinition: text("published_definition"),
    schemaVersion: integer("schema_version").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  },
  (table) => [index("idx_simulators_updated_at").on(table.updatedAt)],
);

/**
 * Table `locks` — verrous d'édition (un par simulateur).
 *
 * - `user_id` : identité de l'utilisateur qui détient le verrou.
 * - `expires_at` : timestamp d'expiration (ms epoch). Au-delà, le verrou peut
 *   être pris par un autre user (TTL 15 min par défaut, prolongeable par heartbeat).
 */
export const locks = sqliteTable(
  "locks",
  {
    simulatorId: integer("simulator_id")
      .primaryKey()
      .references(() => simulators.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    acquiredAt: integer("acquired_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("idx_locks_expires_at").on(table.expiresAt)],
);

export type SimulatorRow = typeof simulators.$inferSelect;
export type LockRow = typeof locks.$inferSelect;
