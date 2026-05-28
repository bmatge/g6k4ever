import { z } from "zod";

/**
 * Note de bas de page — texte riche avec interpolation `#var`.
 *
 * Sa visibilité est pilotée par des règles `showObject`/`hideObject` avec target
 * de type `footnote`.
 */
export const Footnote = z.object({
  id: z.union([z.string(), z.number()]),
  text: z.string().min(1),
});
export type Footnote = z.infer<typeof Footnote>;
