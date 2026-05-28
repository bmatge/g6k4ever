import { z } from "zod";

/**
 * Un bloc d'interface dans une étape — enveloppe générique.
 *
 * `type` désigne la classe de bloc dans le registre @g6k4ever/blocks (Phase 4).
 * `config` est validé par le registre des blocs, PAS par ce schéma : le schéma
 * du simulateur reste agnostique vis-à-vis du catalogue de blocs disponible.
 *
 * Conséquence pratique :
 *   - safeParse() d'un Simulator garantit la structure générale.
 *   - L'éditeur et l'API doivent valider chaque bloc via le registre avant persistance.
 *
 * Les types de blocs MVP attendus (cf. docs/analysis/corpus-patterns.md et
 * _corpus/targets.md) : `field`, `text-section`, `chapter`, `accordion`,
 * `kpi-card`, `breakdown-table`, `footnote`, `notification`, `reset-button`.
 */
export const Block = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  /** Configuration du bloc — schéma propre à chaque type, validé par @g6k4ever/blocks. */
  config: z.unknown(),
});
export type Block = z.infer<typeof Block>;
