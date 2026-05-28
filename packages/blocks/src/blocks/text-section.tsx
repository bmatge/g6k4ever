import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `text-section` — texte riche avec interpolation `#<id>`.
 *
 * Utilisé pour les sections de résultat conditionnel (cf. corpus `frais-locataire`
 * et `taxeLogementsVacants`). Le runtime applique l'interpolation au moment du
 * rendu en utilisant l'état courant.
 *
 * Variants visuels (callout DSFR) : `default`, `info`, `warning`, `success`.
 */
export const TextSectionConfig = z.object({
  content: z.string().min(1).describe("Texte à afficher (avec interpolation #var)"),
  variant: z.enum(["default", "info", "warning", "success"]).default("default"),
  title: z.string().optional(),
});
export type TextSectionConfig = z.infer<typeof TextSectionConfig>;

const HASH_RE = /#(\d+)/g;

function interpolate(text: string, values: Map<number, unknown>): string {
  return text.replace(HASH_RE, (_match, idStr: string) => {
    const id = Number(idStr);
    const v = values.get(id);
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

const TextSectionRender: ComponentType<BlockRenderProps<TextSectionConfig>> = ({ config, state }) => {
  const text = interpolate(config.content, state.values);
  const classNames = ["fr-callout"];
  if (config.variant === "info") classNames.push("fr-callout--blue-cumulus");
  else if (config.variant === "warning") classNames.push("fr-callout--orange-terre-battue");
  else if (config.variant === "success") classNames.push("fr-callout--green-emeraude");
  return (
    <div className={classNames.join(" ")}>
      {config.title ? <p className="fr-callout__title">{config.title}</p> : null}
      <p className="fr-callout__text" style={{ whiteSpace: "pre-line" }}>
        {text}
      </p>
    </div>
  );
};

export const textSectionBlock: BlockDefinition<TextSectionConfig> = {
  type: "text-section",
  configSchema: TextSectionConfig,
  editorMeta: {
    label: "Section de texte",
    icon: "fr-icon-article-line",
    group: "Texte",
    description: "Bloc de texte riche avec interpolation #var, optionnellement encadré en callout DSFR.",
  },
  readsDataIds: (config) => {
    const ids = new Set<number>();
    for (const match of config.content.matchAll(HASH_RE)) {
      const idMatch = match[1];
      if (idMatch !== undefined) ids.add(Number(idMatch));
    }
    return Array.from(ids);
  },
  writesDataIds: () => [],
  render: TextSectionRender,
};
