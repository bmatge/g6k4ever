import { z } from "zod";

/**
 * Spécification d'une colonne d'une datasource.
 */
export const ColumnSpec = z.object({
  name: z.string().min(1),
  type: z.enum(["integer", "number", "text", "boolean", "date"]),
  label: z.string().optional(),
});
export type ColumnSpec = z.infer<typeof ColumnSpec>;

/**
 * Spécification d'un paramètre d'une datasource (database ou api).
 */
export const ParameterSpec = z.object({
  name: z.string().min(1),
  type: z.enum(["integer", "number", "text", "boolean", "date"]),
  /** Position dans la requête (`%1$s`, `%2$d` côté SQL G6K). 1-indexed. */
  position: z.number().int().positive().optional(),
  /** Indique d'où vient la valeur : input par défaut, ou data référencée. */
  bindToDataId: z.number().int().positive().optional(),
});
export type ParameterSpec = z.infer<typeof ParameterSpec>;

/**
 * Datasource `inline` : table éditable en back-office, figée à la publication.
 * Cf. CLAUDE.md §4 règle 5.
 */
export const InlineDataSource = z.object({
  kind: z.literal("inline"),
  id: z.string().min(1),
  label: z.string().min(1),
  columns: z.array(ColumnSpec).min(1),
  rows: z.array(z.record(z.string(), z.unknown())),
});
export type InlineDataSource = z.infer<typeof InlineDataSource>;

/**
 * Datasource `database` : requête SQL paramétrée. Power-user (cf. trappe expert).
 *
 * Les paramètres sont **bornés** (jamais d'interpolation de fragment SQL). Les valeurs
 * sont passées en paramètres préparés côté @g6k4ever/api.
 */
export const DatabaseDataSource = z.object({
  kind: z.literal("database"),
  id: z.string().min(1),
  label: z.string().min(1),
  /** Identifiant de la connexion (configurée dans l'API, jamais en clair ici). */
  connectionId: z.string().min(1),
  /** Requête SQL avec placeholders positionnels (`%1$s`, `%2$d`...). */
  query: z.string().min(1),
  parameters: z.array(ParameterSpec).default([]),
  columns: z.array(ColumnSpec).min(1),
});
export type DatabaseDataSource = z.infer<typeof DatabaseDataSource>;

/**
 * Datasource `api` : connecteur HTTP avec cache TTL.
 *
 * Le proxy + cache est géré par @g6k4ever/api ; le moteur ne fait jamais d'appel HTTP.
 */
export const ApiDataSource = z.object({
  kind: z.literal("api"),
  id: z.string().min(1),
  label: z.string().min(1),
  uri: z.string().min(1),
  method: z.enum(["GET", "POST"]).default("GET"),
  parameters: z.array(ParameterSpec).default([]),
  /** TTL du cache côté API (secondes). 0 = pas de cache. */
  cacheTTLSeconds: z.number().int().nonnegative().default(0),
  /** Chemin JSONPath de projection dans la réponse. */
  returnPath: z.string().optional(),
});
export type ApiDataSource = z.infer<typeof ApiDataSource>;

export const DataSource = z.discriminatedUnion("kind", [
  InlineDataSource,
  DatabaseDataSource,
  ApiDataSource,
]);
export type DataSource = z.infer<typeof DataSource>;
