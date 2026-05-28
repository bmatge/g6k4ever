/**
 * @g6k4ever/runtime — runtime React + react-dsfr.
 *
 * Phase 6. Composant `<Simulator>` qui consomme `@g6k4ever/blocks`, appelle
 * `@g6k4ever/engine` en local et rend le résultat. Embeddable dans un portail
 * DSFR existant (la DSFR doit être déjà initialisée par le host) ou utilisable
 * standalone (bundle `dist/`).
 *
 * Budget bundle ≤ 120kB gzipped hors DSFR (cf. CLAUDE.md §11).
 */

export const RUNTIME_PACKAGE_VERSION = "0.0.0" as const;

export { Simulator, type SimulatorProps } from "./Simulator.js";
export { fraisLocataireInline } from "./frais-locataire-inline.js";
