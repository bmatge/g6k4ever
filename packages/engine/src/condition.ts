import type {
  Condition,
  ConditionExpr,
  ConditionOperator,
} from "@g6k4ever/schema";
import { parseExpression } from "./expression/parser.js";
import {
  compareEquality,
  evaluateAst,
  isDefined,
  type EvalContext,
} from "./expression/evaluator.js";
import { EvaluationError, type FunctionRegistry } from "./types.js";

/**
 * Évalue un ConditionExpr récursivement.
 *
 * Sémantique des connecteurs (cf. docs/analysis/decisions.md D3) :
 *   - all(c1..cn)  ≡ c1 ∧ … ∧ cn (court-circuit)
 *   - any(c1..cn)  ≡ c1 ∨ … ∨ cn (court-circuit)
 *   - none(c1..cn) ≡ ¬(c1 ∨ … ∨ cn)
 */
export function evaluateConditionExpr(
  expr: ConditionExpr,
  values: Map<number, unknown>,
  functions: FunctionRegistry,
): boolean {
  if (expr.kind === "condition") {
    return evaluateLeafCondition(expr, values, functions);
  }
  switch (expr.type) {
    case "all":
      return expr.children.every((child: ConditionExpr) =>
        evaluateConditionExpr(child, values, functions),
      );
    case "any":
      return expr.children.some((child: ConditionExpr) =>
        evaluateConditionExpr(child, values, functions),
      );
    case "none":
      return !expr.children.some((child: ConditionExpr) =>
        evaluateConditionExpr(child, values, functions),
      );
    default: {
      const _unreachable: never = expr.type;
      throw new Error(`Connector type inconnu: ${String(_unreachable)}`);
    }
  }
}

function evaluateLeafCondition(
  condition: Condition,
  values: Map<number, unknown>,
  functions: FunctionRegistry,
): boolean {
  const operandValue = values.get(condition.operand);
  switch (condition.operator) {
    case "present":
      return isDefined(operandValue);
    case "blank":
      return !isDefined(operandValue);
    case "isTrue":
      return (
        operandValue === true ||
        operandValue === "true" ||
        operandValue === 1 ||
        operandValue === "1"
      );
    case "isFalse":
      return (
        operandValue === false ||
        operandValue === "false" ||
        operandValue === 0 ||
        operandValue === "0"
      );
    case "=":
    case "!=":
    case "<":
    case "<=":
    case ">":
    case ">=":
      return evaluateBinaryComparison(
        condition.operator,
        operandValue,
        condition.value!,
        values,
        functions,
      );
    default: {
      const _unreachable: never = condition.operator;
      throw new Error(`Opérateur inconnu: ${String(_unreachable)}`);
    }
  }
}

function evaluateBinaryComparison(
  operator: Exclude<ConditionOperator, "present" | "blank" | "isTrue" | "isFalse">,
  left: unknown,
  rightExpression: string,
  values: Map<number, unknown>,
  functions: FunctionRegistry,
): boolean {
  const right = evaluateExpression(rightExpression, values, functions);
  if (left === undefined || left === null) {
    return operator === "!=";
  }
  switch (operator) {
    case "=":
      return compareEquality(left, right);
    case "!=":
      return !compareEquality(left, right);
    case "<":
      return compareNumeric(left, right) < 0;
    case "<=":
      return compareNumeric(left, right) <= 0;
    case ">":
      return compareNumeric(left, right) > 0;
    case ">=":
      return compareNumeric(left, right) >= 0;
    default: {
      const _unreachable: never = operator;
      throw new Error(`Opérateur binaire inconnu: ${String(_unreachable)}`);
    }
  }
}

function compareNumeric(left: unknown, right: unknown): number {
  const l = Number(left);
  const r = Number(right);
  if (Number.isNaN(l) || Number.isNaN(r)) {
    return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
  }
  return l < r ? -1 : l > r ? 1 : 0;
}

/**
 * Évalue une expression-chaîne (depuis schema.Expression) — utilisé pour la `value`
 * d'une Condition binaire, le `content` d'une Data, et la `value` d'un setAttribute.
 */
export function evaluateExpression(
  source: string,
  values: Map<number, unknown>,
  functions: FunctionRegistry,
): unknown {
  const ast = parseExpression(source);
  const ctx: EvalContext = { values, functions, source };
  try {
    return evaluateAst(ast, ctx);
  } catch (err) {
    if (err instanceof EvaluationError) throw err;
    const reason = err instanceof Error ? err.message : String(err);
    throw new EvaluationError(reason, source);
  }
}
