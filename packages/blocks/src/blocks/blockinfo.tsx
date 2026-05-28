import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `blockinfo` — envelope conditionnelle racine d'un résultat. Souvent
 * contient un ou plusieurs `chapter`. Sa visibilité gère l'affichage global
 * du bloc-résultat (cf. R1 dans la plupart des simulateurs G6K).
 */
export const BlockInfoConfig = z.object({
  title: z.string().optional(),
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
export type BlockInfoConfig = z.infer<typeof BlockInfoConfig>;

const BlockInfoRender: ComponentType<BlockRenderProps<BlockInfoConfig>> = ({ config }) => {
  return (
    <div className="g6k-blockinfo fr-mt-4w" data-blockinfo>
      {config.title ? <h2 className="fr-h3">{config.title}</h2> : null}
    </div>
  );
};

export const blockInfoBlock: BlockDefinition<BlockInfoConfig> = {
  type: "blockinfo",
  configSchema: BlockInfoConfig,
  editorMeta: {
    label: "Bloc résultat",
    icon: "fr-icon-information-line",
    group: "Structure",
    description: "Conteneur racine d'un résultat. Sa visibilité gère l'affichage du résultat global.",
  },
  readsDataIds: () => [],
  writesDataIds: () => [],
  render: BlockInfoRender,
};
