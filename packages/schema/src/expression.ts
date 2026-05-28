import { z } from "zod";

/**
 * Une expression du simulateur — chaîne évaluée par le parser jsep de l'engine.
 *
 * Bornée à : opérateurs arithmétiques (+, -, *, /), comparaisons (=, !=, <, <=, >, >=),
 * opérateurs logiques (&&, ||, !), placeholders #id, littéraux number/string/boolean,
 * et fonctions du registre @g6k4ever/functions.
 *
 * Hors grammaire (cf. docs/analysis/expressions-grammar.md) : pas de boucle, pas de
 * récursion, pas de ternaire, pas de littéral date (utiliser date("YYYY-MM-DD")).
 *
 * La validation syntaxique réelle est faite par l'engine. Le schéma se contente de
 * vérifier que c'est une chaîne non vide.
 */
export const Expression = z.string().min(1).describe("Expression évaluée par jsep");
export type Expression = z.infer<typeof Expression>;
