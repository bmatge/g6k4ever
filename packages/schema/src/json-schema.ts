import { zodToJsonSchema } from "zod-to-json-schema";
import { Simulator } from "./simulator.js";

/**
 * Génère le JSON Schema (draft-07) du Simulator, utilisable :
 *   - par les éditeurs d'IDE pour l'auto-complétion JSON.
 *   - par des validateurs tiers (ajv) côté serveur.
 *   - pour publier la spec hors du repo TypeScript.
 */
export function toJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(Simulator, {
    name: "Simulator",
    target: "jsonSchema7",
  });
}
