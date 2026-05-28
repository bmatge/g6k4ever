import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `reset-button` — bouton « Recommencer la simulation » qui efface tous
 * les inputs. Cibles des règles avec `target.type = "action"` (correspondance
 * G6K : `Action target="action" action="Restart"`).
 *
 * Le runtime fournit `onReset` via le contexte (à câbler en Phase 7.2 si pas
 * encore fait). Pour le MVP : recharge la page comme fallback.
 */
export const ResetButtonConfig = z.object({
  label: z.string().default("Recommencer la simulation"),
});
export type ResetButtonConfig = z.infer<typeof ResetButtonConfig>;

const ResetButtonRender: ComponentType<BlockRenderProps<ResetButtonConfig>> = ({ config }) => {
  return (
    <div className="fr-mt-4w">
      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={() => {
          // Fallback simple : recharge la page (efface tous les state controls).
          if (typeof window !== "undefined") window.location.reload();
        }}
      >
        {config.label}
      </button>
    </div>
  );
};

export const resetButtonBlock: BlockDefinition<ResetButtonConfig> = {
  type: "reset-button",
  configSchema: ResetButtonConfig,
  editorMeta: {
    label: "Bouton Recommencer",
    icon: "fr-icon-restart-line",
    group: "Action",
    description: "Bouton qui efface toutes les saisies pour recommencer.",
  },
  readsDataIds: () => [],
  writesDataIds: () => [],
  render: ResetButtonRender,
};
