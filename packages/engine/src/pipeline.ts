import type { Simulator } from "@g6k4ever/schema";
import { applyAction } from "./action.js";
import { evaluateConditionExpr, evaluateExpression } from "./condition.js";
import type {
  DataSourceResolver,
  FunctionRegistry,
  SimulatorInput,
  SimulatorState,
} from "./types.js";
import { EvaluationError } from "./types.js";

/**
 * Construit l'état initial à partir des entrées utilisateur.
 *
 * Les entrées sont indexées par **nom** de Data ; on les transcrit en map indexée
 * par id pour usage par le moteur.
 */
export function buildInitialState(simulator: Simulator, input: SimulatorInput): SimulatorState {
  const values = new Map<number, unknown>();
  for (const data of simulator.data) {
    if (Object.prototype.hasOwnProperty.call(input, data.name)) {
      values.set(data.id, input[data.name]);
    }
  }
  return {
    values,
    visibility: new Map(),
    notifications: [],
    stable: false,
    iterations: 0,
  };
}

/**
 * Recalcule les valeurs "naturelles" d'une itération.
 *
 * Priorité par Data : input > source > content. Les overrides issus de
 * `setAttribute` de l'itération précédente sont préservés via `previousValues`
 * — la prochaine évaluation des règles peut les écraser à nouveau.
 *
 * Source resolution : utilise `previousValues` pour les paramètres (un cycle de
 * délai accepté, qui converge en peu d'itérations).
 */
export function recomputeNaturalValues(
  simulator: Simulator,
  input: SimulatorInput,
  previousValues: Map<number, unknown>,
  datasources: DataSourceResolver,
  functions: FunctionRegistry,
): Map<number, unknown> {
  const next = new Map<number, unknown>();

  for (const data of simulator.data) {
    // 1. Input direct (par nom)
    if (Object.prototype.hasOwnProperty.call(input, data.name)) {
      next.set(data.id, input[data.name]);
      continue;
    }
    // 2. Source resolution
    if (data.source) {
      const sourceDef = simulator.sources.find((s: Simulator["sources"][number]) => s.id === data.source!.sourceId);
      if (!sourceDef) {
        next.set(data.id, undefined);
        continue;
      }
      const params: Record<string, unknown> = {};
      let allParamsDefined = true;
      // Tous les types de source (inline / database / api) acceptent maintenant
      // un tableau `parameters`. Si un paramètre n'est pas borné (Data non encore
      // définie), on attend la prochaine itération du point fixe.
      for (const p of sourceDef.parameters) {
        if (p.bindToDataId !== undefined) {
          const v = previousValues.get(p.bindToDataId);
          if (v === undefined || v === null || v === "") {
            allParamsDefined = false;
            break;
          }
          params[p.name] = v;
        }
      }
      if (!allParamsDefined) {
        next.set(data.id, undefined);
        continue;
      }
      const row = datasources.resolve(sourceDef.id, params);
      if (row === null) {
        next.set(data.id, undefined);
        continue;
      }
      const returnPath = data.source.returnPath;
      if (returnPath !== undefined && row[returnPath] !== undefined) {
        next.set(data.id, row[returnPath]);
      } else {
        next.set(data.id, row);
      }
      continue;
    }
    // 3. Content expression
    if (data.content) {
      try {
        const v = evaluateExpression(data.content, previousValues, functions);
        next.set(data.id, v);
      } catch (err) {
        if (err instanceof EvaluationError) {
          next.set(data.id, undefined);
        } else {
          throw err;
        }
      }
      continue;
    }
    // 4. Conserver l'override de l'itération précédente si présent (setAttribute
    //    a peut-être écrit une valeur, ou bien on a déjà évalué le default).
    if (previousValues.has(data.id)) {
      next.set(data.id, previousValues.get(data.id));
      continue;
    }
    // 5. Valeur par défaut (expression) — utilisée comme « initial » quand
    //    aucune autre voie ne fournit de valeur. Évaluée 1× lors de la 1re
    //    itération ; les itérations suivantes la voient via previousValues
    //    et peuvent être écrasées par un setAttribute.
    if (data.default) {
      try {
        const v = evaluateExpression(data.default, previousValues, functions);
        next.set(data.id, v);
      } catch (err) {
        if (!(err instanceof EvaluationError)) throw err;
        // valeur défaut invalide → laisser undefined
      }
    }
  }

  return next;
}

/**
 * Exécute toutes les règles dans l'ordre XML — chaque action mute `state` en place,
 * visible aux règles suivantes.
 */
export function evaluateRules(simulator: Simulator, state: SimulatorState, functions: FunctionRegistry): void {
  state.notifications = [];
  for (const rule of simulator.rules) {
    const conditionsTrue = evaluateConditionExpr(rule.conditions, state.values, functions);
    const actions = conditionsTrue ? rule.ifActions : rule.elseActions;
    for (const action of actions) {
      applyAction(action, state, functions);
    }
  }
}

/**
 * Vérifie si deux états sont équivalents (même valeurs, visibilité, notifications).
 * Utilisé pour détecter le point fixe.
 */
export function statesEqual(a: SimulatorState, b: SimulatorState): boolean {
  if (a.values.size !== b.values.size) return false;
  for (const [k, v] of a.values) {
    if (!b.values.has(k)) return false;
    if (!sameValue(v, b.values.get(k))) return false;
  }
  if (a.visibility.size !== b.visibility.size) return false;
  for (const [k, v] of a.visibility) {
    if (b.visibility.get(k) !== v) return false;
  }
  if (a.notifications.length !== b.notifications.length) return false;
  for (let i = 0; i < a.notifications.length; i++) {
    const na = a.notifications[i]!;
    const nb = b.notifications[i]!;
    if (
      na.level !== nb.level ||
      na.message !== nb.message ||
      na.targetType !== nb.targetType ||
      String(na.targetId) !== String(nb.targetId)
    ) {
      return false;
    }
  }
  return true;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return false;
  // NaN
  if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b)) return true;
  return false;
}

/**
 * Snapshot peu coûteux d'un état pour comparaison après itération.
 */
export function snapshotState(state: SimulatorState): SimulatorState {
  return {
    values: new Map(state.values),
    visibility: new Map(state.visibility),
    notifications: state.notifications.map((n) => ({ ...n })),
    stable: state.stable,
    iterations: state.iterations,
  };
}
