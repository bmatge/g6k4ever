import { z } from "zod";
import { Expression } from "./expression.js";

/**
 * Les 12 cibles d'action observées dans le corpus G6K (cf. docs/analysis/g6k-model.md §Actions).
 */
export const ObjectTargetType = z.enum([
  "step",
  "panel",
  "fieldset",
  "field",
  "section",
  "chapter",
  "footnote",
  "blockinfo",
  "prenote",
  "postnote",
  "action",
  "data",
]);
export type ObjectTargetType = z.infer<typeof ObjectTargetType>;

/**
 * Référence d'un objet — type + identifiant (string ou number selon le type d'objet).
 */
export const ObjectTarget = z.object({
  type: ObjectTargetType,
  id: z.union([z.string(), z.number()]),
});
export type ObjectTarget = z.infer<typeof ObjectTarget>;

/**
 * Action `show` / `hide` — montre ou masque un objet.
 *
 * Cible : n'importe quel objet de la hiérarchie de rendu (step, panel, section, etc.).
 */
export const ShowHideAction = z.object({
  kind: z.enum(["showObject", "hideObject"]),
  target: ObjectTarget,
});
export type ShowHideAction = z.infer<typeof ShowHideAction>;

/**
 * Action `setAttribute` — affecte une expression calculée à l'attribut d'une Data.
 *
 * Dans le corpus G6K, l'attribut est quasi exclusivement `"content"`, qui est la
 * valeur calculée propagée à chaque cycle. Le schéma autorise d'autres attributs
 * pour faciliter de futures extensions.
 */
export const SetAttributeAction = z.object({
  kind: z.literal("setAttribute"),
  target: z.object({
    type: z.literal("data"),
    id: z.number().int().positive(),
    attribute: z.string().min(1).default("content"),
  }),
  value: Expression,
});
export type SetAttributeAction = z.infer<typeof SetAttributeAction>;

/**
 * Action `unsetAttribute` — réinitialise l'attribut d'une Data.
 */
export const UnsetAttributeAction = z.object({
  kind: z.literal("unsetAttribute"),
  target: z.object({
    type: z.literal("data"),
    id: z.number().int().positive(),
    attribute: z.string().min(1).default("content"),
  }),
});
export type UnsetAttributeAction = z.infer<typeof UnsetAttributeAction>;

/**
 * Action `notifyError` / `notifyWarning` — signale un message au contributeur.
 *
 * Validation métier de première classe (cf. CLAUDE.md §7 et plan §1). Le message
 * peut être une chaîne avec interpolations `#var`.
 */
export const NotifyAction = z.object({
  kind: z.enum(["notifyError", "notifyWarning"]),
  target: z.object({
    type: z.enum(["data", "step"]),
    id: z.union([z.string(), z.number()]),
  }),
  /** Message affiché ; interpolation `#var` autorisée. */
  message: z.string().min(1),
});
export type NotifyAction = z.infer<typeof NotifyAction>;

export const Action = z.discriminatedUnion("kind", [
  ShowHideAction,
  SetAttributeAction,
  UnsetAttributeAction,
  NotifyAction,
]);
export type Action = z.infer<typeof Action>;
