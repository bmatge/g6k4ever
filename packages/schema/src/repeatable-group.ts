import { z } from "zod";
import { DataType } from "./data.js";

/**
 * Template d'une Data au sein d'un `RepeatableGroup`. Les chaînes `name` et
 * `label` peuvent contenir `{i}` qui sera remplacé par l'index de l'itération.
 * Idem pour `content` (expression) — par exemple `#100 + #{i+200}` pour
 * référencer une Data d'un autre template à la même itération.
 */
export const DataTemplate = z.object({
  /** Offset par rapport à l'id de base de l'itération. */
  idOffset: z.number().int().nonnegative(),
  /** Nom de la Data — peut contenir `{i}`. */
  name: z.string().min(1),
  /** Libellé — peut contenir `{i}`. */
  label: z.string().min(1),
  type: DataType,
  /** Expression `content` — peut contenir `{i}` pour interpoler l'index. */
  content: z.string().optional(),
  default: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  unit: z.string().optional(),
});
export type DataTemplate = z.infer<typeof DataTemplate>;

/**
 * Groupe répétable : génère N copies des `dataTemplates` à l'expansion.
 *
 * Pour chaque itération `i` (de `startIndex` à `startIndex + iterations - 1`) :
 *   - Chaque template produit une Data avec :
 *     - id = `dataIdBase + i * dataIdStride + tmpl.idOffset`
 *     - name = `tmpl.name` avec `{i}` remplacé par `i`
 *     - label = `tmpl.label` avec `{i}` remplacé par `i`
 *     - content = `tmpl.content` avec `{i}` remplacé par `i`
 *
 * Exemple : 12 mois × 2 Data par mois (prix + quantité) avec
 *   dataIdBase=100, dataIdStride=10, startIndex=1 →
 *   i=1 : Data 100 "prix1", 101 "qte1"
 *   i=2 : Data 110 "prix2", 111 "qte2"
 *   ...
 *   i=12 : Data 210 "prix12", 211 "qte12"
 */
export const RepeatableGroup = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  iterations: z.number().int().positive(),
  startIndex: z.number().int().default(1),
  dataIdBase: z.number().int().positive(),
  /** Espacement entre id de deux itérations. Doit être ≥ max(idOffset)+1. */
  dataIdStride: z.number().int().positive(),
  dataTemplates: z.array(DataTemplate).min(1),
});
export type RepeatableGroup = z.infer<typeof RepeatableGroup>;
