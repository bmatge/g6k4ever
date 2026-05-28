/**
 * Types publics du moteur d'évaluation.
 *
 * Le moteur reçoit une définition de simulateur (typée par `@g6k4ever/schema`),
 * un jeu d'entrées et un set de résolveurs injectés, et produit un `SimulatorState`
 * stable (point fixe atteint) ou lève une erreur si la propagation diverge.
 *
 * Aucun import React, DOM ou HTTP n'apparaît ici (cf. CLAUDE.md §4 règle 1).
 */

import type { Simulator } from "@g6k4ever/schema";

/**
 * Clé d'identification d'un objet visible dans le rendu : `"<type>:<id>"`.
 *
 * Exemple : `"section:section-zone-1"`, `"chapter:chapter-tlv-applique"`.
 */
export type ObjectKey = string;

export function objectKey(type: string, id: string | number): ObjectKey {
  return `${type}:${String(id)}`;
}

/**
 * Niveau d'une notification métier (`notifyError`/`notifyWarning`).
 */
export type NotificationLevel = "error" | "warning";

/**
 * Une notification produite par une règle `notifyError`/`notifyWarning`.
 */
export interface Notification {
  level: NotificationLevel;
  message: string;
  targetType: "data" | "step";
  targetId: string | number;
}

/**
 * État du simulateur à un instant donné.
 *
 * `values` est indexé par **id de Data** (pas par nom). Les noms sont utiles
 * en entrée et pour le rendu, mais le moteur travaille en ids.
 */
export interface SimulatorState {
  /** Valeur courante par id de Data (`undefined` = non résolu). */
  values: Map<number, unknown>;
  /** Visibilité par `ObjectKey`. `undefined` = visible par défaut. */
  visibility: Map<ObjectKey, boolean>;
  /** Notifications accumulées sur l'itération courante. */
  notifications: Notification[];
  /** Le point fixe a-t-il été atteint ? */
  stable: boolean;
  /** Nombre d'itérations consommées. */
  iterations: number;
}

/**
 * Entrées de l'utilisateur, indexées par **nom** de Data (pratique pour les
 * consommateurs : éditeur, API, runtime).
 */
export type SimulatorInput = Record<string, unknown>;

/**
 * Résolveur injecté qui fournit une ligne de datasource à partir d'un id de source
 * et d'un dict de paramètres.
 *
 * - Pour les datasources `inline`, lit dans une table en mémoire.
 * - Pour `database` et `api`, le résolveur est typiquement implémenté côté
 *   `@g6k4ever/api` (qui fait les appels et le cache) et passé au moteur via
 *   une projection synchrone.
 *
 * Retourne `null` si aucune ligne ne matche.
 */
export interface DataSourceResolver {
  resolve(sourceId: string, parameters: Record<string, unknown>): Record<string, unknown> | null;
}

/**
 * Registre des fonctions appelables depuis les expressions.
 *
 * Implémenté par `@g6k4ever/functions` (registre standard) et étendu par les
 * développeurs avec leurs fonctions métier (cf. CLAUDE.md §3, plan §3).
 */
export interface FunctionRegistry {
  has(name: string): boolean;
  call(name: string, args: unknown[]): unknown;
}

/**
 * Options passées à `evaluate(...)`.
 */
export interface EvaluateOptions {
  /** Résolveurs injectés. */
  resolvers: {
    datasources: DataSourceResolver;
  };
  /** Registre des fonctions appelables depuis les expressions. */
  functions: FunctionRegistry;
  /**
   * Plafond d'itérations du point fixe.
   * Au-delà, une `ConvergenceError` est levée.
   * @default 10
   */
  maxIterations?: number;
}

/**
 * Erreur levée quand la propagation des règles ne converge pas après
 * `maxIterations` itérations.
 */
export class ConvergenceError extends Error {
  constructor(
    readonly iterations: number,
    readonly lastState: SimulatorState,
  ) {
    super(
      `Le moteur n'a pas convergé après ${iterations} itérations. Vérifier les règles pour des dépendances cycliques (rule.setAttribute → rule.condition → rule.setAttribute).`,
    );
    this.name = "ConvergenceError";
  }
}

/**
 * Erreur levée quand l'évaluation d'une expression échoue (syntaxe inconnue,
 * fonction non enregistrée, opérateur non supporté, etc.).
 */
export class EvaluationError extends Error {
  constructor(
    message: string,
    readonly expression: string,
  ) {
    super(`Erreur d'évaluation de l'expression "${expression}" : ${message}`);
    this.name = "EvaluationError";
  }
}

/**
 * Signature publique du moteur — exportée par index.ts.
 */
export type Evaluate = (
  simulator: Simulator,
  input: SimulatorInput,
  options: EvaluateOptions,
) => SimulatorState;
