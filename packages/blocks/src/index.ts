/**
 * @g6k4ever/blocks — registre de blocs DSFR.
 *
 * Une définition par bloc, consommée par le runtime ET l'éditeur (cf. CLAUDE.md §4
 * règle 2). Pour ajouter un bloc : créer un `BlockDefinition<TConfig>` dans
 * `src/blocks/`, l'enregistrer dans le registre.
 *
 * Phase 4 du plan. Pour la suite (Phase 6+7), runtime et éditeur consomment ce
 * registre via `createStandardRegistry()` ou un registre custom.
 */

export const BLOCKS_PACKAGE_VERSION = "0.0.0" as const;

export {
  type BlockDefinition,
  type BlockRenderProps,
  type BlockRenderState,
  type BlockEditorMeta,
  BlockValidationError,
} from "./types.js";
export { BlockRegistry } from "./registry.js";
export { createStandardRegistry } from "./standard.js";
export { textSectionBlock, TextSectionConfig } from "./blocks/text-section.js";
export { fieldBlock, FieldConfig } from "./blocks/field.js";
export { kpiCardBlock, KpiCardConfig } from "./blocks/kpi-card.js";
