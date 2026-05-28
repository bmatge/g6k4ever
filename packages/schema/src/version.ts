/**
 * Version du schéma. Incrémenter à chaque évolution incompatible.
 * Toute évolution prévoit sa migration (cf. CLAUDE.md §4 règle 6).
 */
export const SCHEMA_VERSION = 1 as const;
export type SchemaVersion = typeof SCHEMA_VERSION;
