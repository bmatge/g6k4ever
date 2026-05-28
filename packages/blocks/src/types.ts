import type { ComponentType } from "react";
import type { z } from "zod";

/**
 * Représentation minimale de l'état du simulateur consommée par le rendu des blocs.
 *
 * Calquée sur `@g6k4ever/engine` mais redéfinie ici pour découpler `@g6k4ever/blocks`
 * du package engine (évite les boucles de deps Turbo, cf. ADR-029).
 */
export interface BlockRenderState {
  /** Valeurs courantes des Data, indexées par id. */
  values: Map<number, unknown>;
  /** Visibilité des objets : clé `"type:id"`, valeur `boolean`. */
  visibility: Map<string, boolean>;
  /** Callback : l'utilisateur a saisi une valeur pour cette Data. */
  onInput?: (dataName: string, value: unknown) => void;
  /** Lookup d'une Data par id ou nom — fourni par le runtime. */
  getDataLabel?: (idOrName: number | string) => string | undefined;
}

/**
 * Métadonnées d'édition affichées dans la palette de l'éditeur.
 */
export interface BlockEditorMeta {
  /** Libellé court (palette d'éditeur). */
  label: string;
  /** Identifiant d'icône DSFR (ex. `"fr-icon-file-text-line"`). */
  icon: string;
  /** Groupe dans la palette (ex. `"saisie"`, `"résultat"`, `"texte"`). */
  group: string;
  /** Description plus longue (tooltip). */
  description: string;
}

/**
 * Définition canonique d'un bloc.
 *
 * Source unique consommée par le runtime (pour rendre) ET par l'éditeur (pour
 * configurer). Une définition par bloc — pas de double implémentation
 * (cf. CLAUDE.md §4 règle 2).
 *
 * @template TConfig  type de la configuration du bloc.
 */
export interface BlockDefinition<TConfig> {
  /** Identifiant unique du type de bloc (ex. `"text-section"`, `"field"`). */
  type: string;
  /**
   * Schéma Zod de la configuration. Validé par l'éditeur et l'API à la sauvegarde.
   *
   * Type permissif `ZodType<TConfig, ZodTypeDef, unknown>` pour autoriser les
   * schémas avec `.default()` qui rendent l'input plus permissif que l'output
   * (problème classique d'inférence Zod sur les defaults).
   */
  configSchema: z.ZodType<TConfig, z.ZodTypeDef, unknown>;
  /** Métadonnées affichées dans la palette de l'éditeur. */
  editorMeta: BlockEditorMeta;
  /** Liste des ids de Data lus par ce bloc (pour le moteur de dépendances de l'éditeur). */
  readsDataIds: (config: TConfig) => number[];
  /** Liste des ids de Data écrits par ce bloc (typiquement les inputs). */
  writesDataIds: (config: TConfig) => number[];
  /** Composant React de rendu. Reçoit la config typée et l'état. */
  render: ComponentType<BlockRenderProps<TConfig>>;
}

export interface BlockRenderProps<TConfig> {
  config: TConfig;
  state: BlockRenderState;
}

/**
 * Erreur lancée à la consommation d'un bloc invalide (config invalide ou type
 * non enregistré).
 */
export class BlockValidationError extends Error {
  constructor(
    readonly blockType: string,
    readonly details: string,
  ) {
    super(`Bloc invalide (type="${blockType}"): ${details}`);
    this.name = "BlockValidationError";
  }
}
