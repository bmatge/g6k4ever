import type { Action } from "@g6k4ever/schema";
import { evaluateExpression } from "./condition.js";
import { interpolate } from "./interpolate.js";
import { objectKey, type FunctionRegistry, type Notification, type SimulatorState } from "./types.js";

/**
 * Applique une action sur l'état. Mutation in-place : les modifications sont
 * immédiatement visibles aux règles suivantes de la même itération (cf.
 * docs/analysis/decisions.md D1 — fixed-point avec ordre XML comme tie-breaker).
 */
export function applyAction(action: Action, state: SimulatorState, functions: FunctionRegistry): void {
  switch (action.kind) {
    case "showObject":
      state.visibility.set(objectKey(action.target.type, action.target.id), true);
      return;
    case "hideObject":
      state.visibility.set(objectKey(action.target.type, action.target.id), false);
      return;
    case "setAttribute": {
      const value = evaluateExpression(action.value, state.values, functions);
      state.values.set(action.target.id, value);
      return;
    }
    case "unsetAttribute":
      state.values.delete(action.target.id);
      return;
    case "notifyError":
    case "notifyWarning": {
      const message = interpolate(action.message, state.values);
      const notification: Notification = {
        level: action.kind === "notifyError" ? "error" : "warning",
        message,
        targetType: action.target.type,
        targetId: action.target.id,
      };
      state.notifications.push(notification);
      return;
    }
  }
}
