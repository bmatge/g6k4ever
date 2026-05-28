import { z } from "zod";
import { Expression } from "./expression.js";

/**
 * Les 10 opérateurs de condition autorisés (cf. CLAUDE.md §7 et docs/analysis/decisions.md).
 *
 * - `present` / `blank` / `isTrue` / `isFalse` : unaires (sur l'opérande seul).
 * - `=` / `!=` / `<` / `<=` / `>` / `>=` : binaires (opérande + value).
 */
export const ConditionOperator = z.enum([
  "present",
  "blank",
  "=",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "isTrue",
  "isFalse",
]);
export type ConditionOperator = z.infer<typeof ConditionOperator>;

/**
 * Opérateurs qui n'attendent PAS de valeur. La validation `unaire → pas de value`
 * est appliquée au niveau Simulator (cf. simulator.ts superRefine).
 */
export const UNARY_OPERATORS = [
  "present",
  "blank",
  "isTrue",
  "isFalse",
] as const satisfies readonly ConditionOperator[];

export type UnaryOperator = (typeof UNARY_OPERATORS)[number];

export function isUnaryOperator(op: ConditionOperator): op is UnaryOperator {
  return (UNARY_OPERATORS as readonly ConditionOperator[]).includes(op);
}

/**
 * Une condition élémentaire : `operand <operator> [value]`.
 * `operand` désigne l'id numérique d'une Data (référence `#<id>`).
 * `value` est une expression évaluée par jsep (constante, autre `#data`, fonction…).
 */
export const Condition = z.object({
  kind: z.literal("condition"),
  operand: z.number().int().positive(),
  operator: ConditionOperator,
  value: Expression.optional(),
});
export type Condition = z.infer<typeof Condition>;

export const ConnectorType = z.enum(["all", "any", "none"]);
export type ConnectorType = z.infer<typeof ConnectorType>;

/**
 * Connecteur logique imbriquable : `all` / `any` / `none`.
 * Sémantique : cf. docs/analysis/decisions.md D3.
 */
export interface Connector {
  kind: "connector";
  type: ConnectorType;
  children: ConditionExpr[];
}

export type ConditionExpr = Condition | Connector;

export const ConditionExpr: z.ZodType<ConditionExpr> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    Condition,
    z.object({
      kind: z.literal("connector"),
      type: ConnectorType,
      children: z.array(ConditionExpr).min(1),
    }),
  ]),
);

/**
 * Walker récursif sur un ConditionExpr — utilisé par la validation Simulator
 * et par l'engine.
 */
export function walkConditionExpr(expr: ConditionExpr, visit: (c: Condition) => void): void {
  if (expr.kind === "condition") {
    visit(expr);
    return;
  }
  for (const child of expr.children) {
    walkConditionExpr(child, visit);
  }
}
