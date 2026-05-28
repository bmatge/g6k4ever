import { z } from "zod";
import { Expression } from "./expression.js";

/**
 * Types de Data autorisés (cf. CLAUDE.md §7 et docs/analysis/corpus-patterns.md §6).
 */
export const DataType = z.enum([
  "integer",
  "number",
  "money",
  "percent",
  "boolean",
  "choice",
  "text",
  "textarea",
  "date",
  "month",
  "year",
]);
export type DataType = z.infer<typeof DataType>;

/**
 * Option d'un champ de type `choice`.
 */
export const ChoiceOption = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string().min(1),
});
export type ChoiceOption = z.infer<typeof ChoiceOption>;

/**
 * Une donnée (variable) du simulateur.
 *
 * Référencée par `#<id>` dans les expressions. Le `name` est utilisé en mode guidé
 * comme étiquette lisible mais n'apparaît jamais dans une expression compilée.
 */
export const Data = z
  .object({
    id: z.number().int().positive(),
    name: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Identifiant invalide (lettres, chiffres, _)"),
    label: z.string().min(1),
    type: DataType,
    default: Expression.optional(),
    min: Expression.optional(),
    max: Expression.optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
    /** Options pour les types `choice` uniquement. */
    options: z.array(ChoiceOption).optional(),
    /**
     * Expression calculée — donnée dérivée. Le moteur recalcule `content` à chaque
     * cycle de propagation jusqu'à stabilisation.
     */
    content: Expression.optional(),
    /**
     * Résolution via une datasource. `returnPath` désigne la colonne (ou clé) du
     * résultat à projeter dans la valeur.
     */
    source: z
      .object({
        sourceId: z.string().min(1),
        returnPath: z.string().min(1).optional(),
      })
      .optional(),
    /**
     * Indice de widget côté éditeur — n'affecte pas le moteur.
     * Exemples observés dans le corpus G6K : `geoAPILocalities`, `geoAPIZipCodeGetInfo`,
     * `abDatepicker`. Variant `range` pour les sliders de portail-elec.
     */
    widget: z.string().optional(),
  })
  .refine((d) => d.type !== "choice" || (d.options && d.options.length > 0), {
    message: "Un champ `choice` doit déclarer au moins une option.",
    path: ["options"],
  });
export type Data = z.infer<typeof Data>;
