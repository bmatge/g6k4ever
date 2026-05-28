import type { AstNode } from "./parser.js";
import { dataIdFromIdentifier } from "./preprocess.js";
import { EvaluationError, type FunctionRegistry } from "../types.js";

/**
 * Contexte d'évaluation d'une expression.
 */
export interface EvalContext {
  /** Valeurs des Data, indexées par id. */
  values: Map<number, unknown>;
  /** Registre des fonctions. */
  functions: FunctionRegistry;
  /** Expression source — utilisée pour les messages d'erreur. */
  source: string;
}

/**
 * Évalue un AST jsep dans le contexte fourni.
 *
 * Bornée à : Literal, Identifier (résolu en `#id`), BinaryExpression
 * (+/-/`*`/`/`/`%`/`==`/`!=`/`<`/`<=`/`>`/`>=`), LogicalExpression (`&&`/`||`),
 * UnaryExpression (`!`/`-`/`+`), CallExpression (fonctions du registre),
 * ConditionalExpression (ternaire).
 *
 * Lance `EvaluationError` pour toute construction hors périmètre (MemberExpression,
 * ArrayExpression, Compound, opérateurs inconnus).
 */
export function evaluateAst(node: AstNode, ctx: EvalContext): unknown {
  switch (node.type) {
    case "Literal":
      return node.value;

    case "Identifier": {
      // jsep classe undefined/null comme Identifier (et non Literal). On les
      // résout directement.
      if (node.name === "undefined") return undefined;
      if (node.name === "null") return null;
      const dataId = dataIdFromIdentifier(node.name);
      if (dataId === null) {
        throw new EvaluationError(`identifiant inconnu "${node.name}"`, ctx.source);
      }
      return ctx.values.get(dataId);
    }

    case "UnaryExpression": {
      const arg = evaluateAst(node.argument, ctx);
      switch (node.operator) {
        case "!":
          return !truthy(arg);
        case "-":
          return -toNumber(arg, ctx);
        case "+":
          return +toNumber(arg, ctx);
        default:
          throw new EvaluationError(`opérateur unaire non supporté "${node.operator}"`, ctx.source);
      }
    }

    case "BinaryExpression": {
      // jsep classifie &&/|| en BinaryExpression par défaut (sans plugin) —
      // on les route vers la sémantique court-circuit de LogicalExpression.
      if (node.operator === "&&") {
        const left = evaluateAst(node.left, ctx);
        return truthy(left) ? evaluateAst(node.right, ctx) : left;
      }
      if (node.operator === "||") {
        const left = evaluateAst(node.left, ctx);
        return truthy(left) ? left : evaluateAst(node.right, ctx);
      }
      const left = evaluateAst(node.left, ctx);
      const right = evaluateAst(node.right, ctx);
      return applyBinary(node.operator, left, right, ctx);
    }

    case "LogicalExpression": {
      // Court-circuit
      const left = evaluateAst(node.left, ctx);
      if (node.operator === "&&") {
        return truthy(left) ? evaluateAst(node.right, ctx) : left;
      }
      // ||
      return truthy(left) ? left : evaluateAst(node.right, ctx);
    }

    case "ConditionalExpression": {
      const test = evaluateAst(node.test, ctx);
      return truthy(test) ? evaluateAst(node.consequent, ctx) : evaluateAst(node.alternate, ctx);
    }

    case "CallExpression": {
      if (node.callee.type !== "Identifier") {
        throw new EvaluationError("appel de fonction non simple (only Identifier callee)", ctx.source);
      }
      const fnName = node.callee.name;
      // `defined()` est une fonction primitive — pas besoin de l'enregistrer.
      const args = node.arguments.map((arg) => evaluateAst(arg, ctx));
      if (fnName === "defined") {
        if (args.length !== 1) {
          throw new EvaluationError("defined() attend 1 argument", ctx.source);
        }
        return isDefined(args[0]);
      }
      if (!ctx.functions.has(fnName)) {
        throw new EvaluationError(`fonction inconnue "${fnName}"`, ctx.source);
      }
      return ctx.functions.call(fnName, args);
    }

    case "MemberExpression":
    case "ArrayExpression":
    case "Compound":
      throw new EvaluationError(`construction non supportée (${node.type})`, ctx.source);

    default:
      throw new EvaluationError(
        `type d'AST inconnu: ${(node as { type?: string }).type ?? "?"}`,
        ctx.source,
      );
  }
}

/**
 * Applique un opérateur binaire (arithmétique ou comparaison).
 */
function applyBinary(op: string, left: unknown, right: unknown, ctx: EvalContext): unknown {
  switch (op) {
    case "+": {
      // Concaténation de chaînes si l'un des opérandes est une chaîne (sémantique JS).
      if (typeof left === "string" || typeof right === "string") {
        return String(left ?? "") + String(right ?? "");
      }
      return toNumber(left, ctx) + toNumber(right, ctx);
    }
    case "-":
      return toNumber(left, ctx) - toNumber(right, ctx);
    case "*":
      return toNumber(left, ctx) * toNumber(right, ctx);
    case "/": {
      const r = toNumber(right, ctx);
      if (r === 0) {
        throw new EvaluationError("division par zéro", ctx.source);
      }
      return toNumber(left, ctx) / r;
    }
    case "%":
      return toNumber(left, ctx) % toNumber(right, ctx);
    case "==":
    case "===":
      return compareEquality(left, right);
    case "!=":
    case "!==":
      return !compareEquality(left, right);
    case "<":
      return compareOrdered(left, right) < 0;
    case "<=":
      return compareOrdered(left, right) <= 0;
    case ">":
      return compareOrdered(left, right) > 0;
    case ">=":
      return compareOrdered(left, right) >= 0;
    default:
      throw new EvaluationError(`opérateur binaire non supporté "${op}"`, ctx.source);
  }
}

/**
 * Coerce un opérande en nombre. `undefined`/`null` → 0 (sémantique tolérante
 * pour les calculs où une saisie manquante donne 0).
 */
function toNumber(v: unknown, ctx: EvalContext): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isNaN(n)) {
      throw new EvaluationError(`conversion en nombre impossible : "${v}"`, ctx.source);
    }
    return n;
  }
  throw new EvaluationError(`opérande non numérique`, ctx.source);
}

/**
 * Compare deux valeurs pour l'égalité, avec coercion numérique tolérante.
 * `undefined` n'égale rien (ni soi-même au sens métier — pour ça il y a `defined()`).
 */
export function compareEquality(left: unknown, right: unknown): boolean {
  if (left === undefined || left === null) return right === undefined || right === null;
  if (right === undefined || right === null) return false;
  if (typeof left === "number" && typeof right === "string") {
    const r = Number(right);
    return !Number.isNaN(r) && left === r;
  }
  if (typeof left === "string" && typeof right === "number") {
    const l = Number(left);
    return !Number.isNaN(l) && l === right;
  }
  if (typeof left === "boolean" && typeof right === "string") {
    return String(left) === right;
  }
  if (typeof left === "string" && typeof right === "boolean") {
    return left === String(right);
  }
  return left === right;
}

/**
 * Compare deux valeurs pour l'ordre. Retourne -1/0/1 (style strcmp).
 * Coerce en nombres si possible.
 */
function compareOrdered(left: unknown, right: unknown): number {
  if (left === undefined || left === null || right === undefined || right === null) return 0;
  const lNum = toNumberSafe(left);
  const rNum = toNumberSafe(right);
  if (lNum !== null && rNum !== null) {
    return lNum < rNum ? -1 : lNum > rNum ? 1 : 0;
  }
  const ls = String(left);
  const rs = String(right);
  return ls < rs ? -1 : ls > rs ? 1 : 0;
}

function toNumberSafe(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Truthy au sens du moteur : `undefined`, `null`, `""`, `0`, `false`, `NaN` sont faux.
 */
export function truthy(v: unknown): boolean {
  return !(v === undefined || v === null || v === "" || v === 0 || v === false || Number.isNaN(v));
}

/**
 * Définition au sens de `defined()` : valeur présente ET non vide.
 */
export function isDefined(v: unknown): boolean {
  return v !== undefined && v !== null && v !== "";
}
