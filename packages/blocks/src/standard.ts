import { BlockRegistry } from "./registry.js";
import { textSectionBlock } from "./blocks/text-section.js";
import { fieldBlock } from "./blocks/field.js";
import { kpiCardBlock } from "./blocks/kpi-card.js";

/**
 * Crée un registre pré-rempli avec les 3 blocs de référence MVP.
 *
 * Pour ajouter un bloc :
 *   1. Écrire son `BlockDefinition<TConfig>` dans `src/blocks/<nom>.tsx`.
 *   2. L'enregistrer ici ou via `registry.register(...)` côté consommateur.
 *
 * Les blocs restant à implémenter pour couvrir tout le corpus MVP (cf.
 * `_corpus/targets.md` §3 et `docs/analysis/corpus-patterns.md`) :
 *   - `chapter`, `blockinfo` (envelopes conditionnelles)
 *   - `accordion` à items conditionnels
 *   - `breakdown-table` (décomposition de calculs)
 *   - `notification` (sortie des `notifyError`/`notifyWarning` du moteur)
 *   - `footnote`, `reset-button`
 */
export function createStandardRegistry(): BlockRegistry {
  const registry = new BlockRegistry();
  registry.register(textSectionBlock);
  registry.register(fieldBlock);
  registry.register(kpiCardBlock);
  return registry;
}
