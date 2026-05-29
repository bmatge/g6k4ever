import { BlockRegistry } from "./registry.js";
import { textSectionBlock } from "./blocks/text-section.js";
import { fieldBlock } from "./blocks/field.js";
import { kpiCardBlock } from "./blocks/kpi-card.js";
import { chapterBlock } from "./blocks/chapter.js";
import { blockInfoBlock } from "./blocks/blockinfo.js";
import { resetButtonBlock } from "./blocks/reset-button.js";
import { notificationBlock } from "./blocks/notification.js";
import { footnoteBlock } from "./blocks/footnote.js";
import { breakdownTableBlock } from "./blocks/breakdown-table.js";

/**
 * Crée un registre pré-rempli avec tous les blocs MVP.
 *
 * Catalogue Phase 7.2 + 8 (TCO portail-elec) :
 *   - Saisie : `field` (11 types + variant range)
 *   - Texte : `text-section` (interpolation #var)
 *   - Résultat : `kpi-card`, `breakdown-table`
 *   - Structure : `chapter`, `blockinfo` (envelopes conditionnelles)
 *   - Information : `notification` (statique), `footnote`
 *   - Action : `reset-button`
 */
export function createStandardRegistry(): BlockRegistry {
  const registry = new BlockRegistry();
  registry.register(fieldBlock);
  registry.register(textSectionBlock);
  registry.register(kpiCardBlock);
  registry.register(breakdownTableBlock);
  registry.register(chapterBlock);
  registry.register(blockInfoBlock);
  registry.register(notificationBlock);
  registry.register(footnoteBlock);
  registry.register(resetButtonBlock);
  return registry;
}
