import { z } from "zod";
import { Block } from "./block.js";

/**
 * Une étape (page) du simulateur. Contient des blocs ordonnés rendus séquentiellement.
 */
export const Step = z.object({
  id: z.union([z.string(), z.number()]),
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/, "Identifiant d'étape invalide"),
  label: z.string().min(1),
  description: z.string().optional(),
  blocks: z.array(Block).default([]),
});
export type Step = z.infer<typeof Step>;
