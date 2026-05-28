/**
 * @g6k4ever/functions — registre de fonctions appelables depuis les expressions.
 *
 * - Fonctions standard fournies : sum, floor, max, min, count, year, date, strftime.
 * - Fonctions métier : injectées par les développeurs via `registry.register(name, impl)`.
 *
 * `defined(x)` est primitive — gérée par l'évaluateur d'expressions de
 * @g6k4ever/engine pour permettre l'évaluation tolérante (`defined(#x)` ne lève
 * pas si #x est undefined).
 */

export const FUNCTIONS_PACKAGE_VERSION = "0.0.0" as const;

export { FunctionRegistryImpl } from "./registry.js";
export { createStandardRegistry } from "./standard.js";
