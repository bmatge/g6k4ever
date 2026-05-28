import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `footnote` — note de bas de page, visible quand une règle l'affiche
 * (cible `type="footnote"`). Texte riche avec interpolation `#<id>`.
 */
export const FootnoteConfig = z.object({
  text: z.string().min(1),
});
export type FootnoteConfig = z.infer<typeof FootnoteConfig>;

const HASH_RE = /#(\d+)/g;
function interpolate(text: string, values: Map<number, unknown>): string {
  return text.replace(HASH_RE, (_match, idStr: string) => {
    const id = Number(idStr);
    const v = values.get(id);
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

const FootnoteRender: ComponentType<BlockRenderProps<FootnoteConfig>> = ({ config, state }) => {
  return (
    <aside className="fr-text--xs fr-mt-2w" style={{ opacity: 0.85, fontStyle: "italic" }}>
      <p style={{ whiteSpace: "pre-line" }}>{interpolate(config.text, state.values)}</p>
    </aside>
  );
};

export const footnoteBlock: BlockDefinition<FootnoteConfig> = {
  type: "footnote",
  configSchema: FootnoteConfig,
  editorMeta: {
    label: "Note de bas de page",
    icon: "fr-icon-quote-line",
    group: "Information",
    description: "Texte secondaire affiché en bas de page, conditionné par les règles.",
  },
  readsDataIds: (config) => {
    const ids = new Set<number>();
    for (const m of config.text.matchAll(HASH_RE)) {
      const idMatch = m[1];
      if (idMatch !== undefined) ids.add(Number(idMatch));
    }
    return Array.from(ids);
  },
  writesDataIds: () => [],
  render: FootnoteRender,
};
