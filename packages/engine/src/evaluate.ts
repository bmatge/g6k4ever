import type { Simulator } from "@g6k4ever/schema";
import {
  ConvergenceError,
  type EvaluateOptions,
  type SimulatorInput,
  type SimulatorState,
} from "./types.js";
import {
  buildInitialState,
  evaluateRules,
  recomputeNaturalValues,
  snapshotState,
  statesEqual,
} from "./pipeline.js";
import { expandGroups } from "./expand-groups.js";

const DEFAULT_MAX_ITERATIONS = 10;

/**
 * Évalue un simulateur sur un jeu d'entrées et retourne son état stable.
 *
 * Pipeline d'une itération :
 *   1. Recalcul des valeurs "naturelles" (input → source → content)
 *      en s'appuyant sur les overrides de l'itération précédente.
 *   2. Évaluation des règles dans l'ordre XML, chaque action mutant l'état
 *      en place (visible aux règles suivantes).
 *   3. Comparaison avec l'état précédent ; si identique → stable, on retourne.
 *
 * Lance `ConvergenceError` si la propagation n'atteint pas le point fixe
 * après `maxIterations` itérations.
 */
export function evaluate(
  rawSimulator: Simulator,
  input: SimulatorInput,
  options: EvaluateOptions,
): SimulatorState {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const { resolvers, functions } = options;

  // Expansion préalable des groupes répétables (no-op si pas de groups).
  const simulator = expandGroups(rawSimulator);
  const state = buildInitialState(simulator, input);

  let previous = snapshotState(state);

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    state.iterations = iteration;
    // 1. Recompute natural values from previous iteration's state.
    state.values = recomputeNaturalValues(
      simulator,
      input,
      previous.values,
      resolvers.datasources,
      functions,
    );
    // 2. Evaluate rules — mutate state in place.
    evaluateRules(simulator, state, functions);
    // 3. Stability check.
    if (statesEqual(state, previous)) {
      state.stable = true;
      return state;
    }
    previous = snapshotState(state);
  }

  throw new ConvergenceError(maxIterations, state);
}
