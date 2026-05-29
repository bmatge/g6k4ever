/**
 * @g6k4ever/engine — moteur d'évaluation TS PUR.
 *
 * Signature publique :
 *   evaluate(simulator, input, { resolvers, functions, maxIterations? }) → SimulatorState
 *
 * Cf. ADR-028 (architecture), ADR-029 (build vs buy), docs/analysis/decisions.md
 * pour le détail des choix sémantiques.
 *
 * Aucune dépendance React/DOM/HTTP. PAS d'eval() ni de new Function().
 */

export const ENGINE_PACKAGE_VERSION = "0.0.0" as const;

export { evaluate } from "./evaluate.js";
export {
  ConvergenceError,
  EvaluationError,
  objectKey,
  type DataSourceResolver,
  type Evaluate,
  type EvaluateOptions,
  type FunctionRegistry,
  type Notification,
  type NotificationLevel,
  type ObjectKey,
  type SimulatorInput,
  type SimulatorState,
} from "./types.js";
export { InMemoryDataSource } from "./resolvers.js";
export { parseExpression } from "./expression/parser.js";
export {
  evaluateAst,
  isDefined,
  truthy,
  compareEquality,
  type EvalContext,
} from "./expression/evaluator.js";
export { preprocessExpression, dataIdFromIdentifier } from "./expression/preprocess.js";
export { evaluateConditionExpr, evaluateExpression } from "./condition.js";
export { interpolate } from "./interpolate.js";
export { applyAction } from "./action.js";
export { expandGroups, interpolateI } from "./expand-groups.js";
