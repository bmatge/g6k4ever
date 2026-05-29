/**
 * @g6k4ever/runtime — runtime React + react-dsfr.
 *
 * Phase 6. Composant `<Simulator>` qui consomme `@g6k4ever/blocks`, appelle
 * `@g6k4ever/engine` en local et rend le résultat. Phase 7.2b ajoute
 * `<SimulatorViaApi>` qui délègue l'évaluation au backend (utile pour les
 * sources `database`/`api` que le moteur en navigateur ne peut pas résoudre).
 *
 * Budget bundle ≤ 120kB gzipped hors DSFR (cf. CLAUDE.md §11).
 */

export const RUNTIME_PACKAGE_VERSION = "0.0.0" as const;

export { Simulator, type SimulatorProps } from "./Simulator.js";
export {
  SimulatorViaApi,
  deserializeSimulatorState,
  type SimulatorViaApiProps,
  type ServerEvaluator,
} from "./SimulatorViaApi.js";
export { fraisLocataireInline } from "./frais-locataire-inline.js";
export { voitureTcoInline } from "./voiture-tco-inline.js";
export { pompeAChaleurInline } from "./pompe-a-chaleur-inline.js";
export { factCheckerInline } from "./fact-checker-inline.js";
export { StandaloneApp } from "./StandaloneApp.js";
