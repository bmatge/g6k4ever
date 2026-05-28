import { z } from "zod";
import { ConditionExpr } from "./condition.js";
import { Action } from "./action.js";

/**
 * Une règle métier : `Si [conditions] Alors [ifActions] Sinon [elseActions]`.
 *
 * Évaluée en propagation point-fixe par l'engine (cf. docs/analysis/decisions.md D1).
 * L'ordre des règles dans cette liste sert de tie-breaker par itération.
 */
export const BusinessRule = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  /** Description libre, lisible par un contributeur en mode guidé. */
  description: z.string().optional(),
  conditions: ConditionExpr,
  ifActions: z.array(Action).default([]),
  elseActions: z.array(Action).default([]),
});
export type BusinessRule = z.infer<typeof BusinessRule>;
