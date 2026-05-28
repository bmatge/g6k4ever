import jsep from "jsep";
import { preprocessExpression } from "./preprocess.js";
import { EvaluationError } from "../types.js";

/**
 * Type minimal des nœuds d'AST jsep que l'évaluateur consomme.
 * Le type officiel de jsep est trop large pour notre besoin ; on liste juste
 * les variantes attendues dans notre périmètre (cf. docs/analysis/expressions-grammar.md).
 */
export type AstNode =
  | { type: "Literal"; value: number | string | boolean | null; raw: string }
  | { type: "Identifier"; name: string }
  | { type: "BinaryExpression"; operator: string; left: AstNode; right: AstNode }
  | { type: "LogicalExpression"; operator: "&&" | "||"; left: AstNode; right: AstNode }
  | { type: "UnaryExpression"; operator: string; argument: AstNode; prefix: boolean }
  | { type: "CallExpression"; callee: AstNode; arguments: AstNode[] }
  | { type: "MemberExpression"; computed: boolean; object: AstNode; property: AstNode }
  | { type: "ArrayExpression"; elements: AstNode[] }
  | { type: "Compound"; body: AstNode[] }
  | { type: "ConditionalExpression"; test: AstNode; consequent: AstNode; alternate: AstNode };

/**
 * Parse une expression G6K (avec placeholders `#id`) en AST jsep.
 *
 * Lance `EvaluationError` si la syntaxe est invalide.
 */
export function parseExpression(source: string): AstNode {
  const preprocessed = preprocessExpression(source);
  try {
    return jsep(preprocessed) as unknown as AstNode;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new EvaluationError(`syntaxe invalide (${reason})`, source);
  }
}
