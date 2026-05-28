import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `chapter` — envelope conditionnelle qui groupe des sections sous un titre
 * optionnel. Sa visibilité est pilotée par des règles `showObject`/`hideObject`
 * ciblant `type="chapter"`.
 *
 * Les blocs enfants sont rendus par le runtime via descente récursive sur
 * `config.blocks`.
 */
export const ChapterConfig = z.object({
  title: z.string().optional(),
  /** Sous-blocs. Validé permissivement ici ; le runtime resolve par `type`. */
  blocks: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        config: z.unknown().optional(),
      }),
    )
    .default([]),
});
export type ChapterConfig = z.infer<typeof ChapterConfig>;

const ChapterRender: ComponentType<BlockRenderProps<ChapterConfig>> = ({ config }) => {
  // Le rendu réel des enfants est géré par le `BlocksList` du runtime. Ce
  // composant ne fait qu'afficher le chrome (titre).
  return (
    <div className="g6k-chapter fr-mt-2w" data-chapter>
      {config.title ? <h3 className="fr-h4">{config.title}</h3> : null}
      {/* Les enfants sont rendus par BlocksList côté runtime (fallback envelope). */}
    </div>
  );
};

export const chapterBlock: BlockDefinition<ChapterConfig> = {
  type: "chapter",
  configSchema: ChapterConfig,
  editorMeta: {
    label: "Chapitre",
    icon: "fr-icon-folder-2-line",
    group: "Structure",
    description: "Groupe des sections sous un titre. Sa visibilité est pilotée par les règles.",
  },
  readsDataIds: () => [],
  writesDataIds: () => [],
  render: ChapterRender,
};
