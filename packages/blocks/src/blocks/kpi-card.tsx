import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `kpi-card` — affichage d'une valeur calculée mise en avant.
 *
 * Utilisé dans le corpus portail-elec (voiture, passer-a-electrique, etc.) pour
 * les KPI hero. Affiche un libellé + une valeur formatée + une tendance optionnelle.
 */
export const KpiCardConfig = z.object({
  label: z.string().min(1),
  dataId: z.number().int().positive(),
  /** Format d'affichage. */
  format: z.enum(["raw", "money", "percent", "integer"]).default("raw"),
  /** Symbole de devise affiché en suffix (par défaut €). */
  currencySymbol: z.string().default("€"),
  /** Texte explicatif sous la valeur. */
  hint: z.string().optional(),
  /** Variante visuelle. */
  variant: z.enum(["default", "highlight"]).default("default"),
});
export type KpiCardConfig = z.infer<typeof KpiCardConfig>;

function formatValue(value: unknown, format: KpiCardConfig["format"], currencySymbol: string): string {
  if (value === undefined || value === null) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  switch (format) {
    case "money":
      return `${num.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currencySymbol}`;
    case "percent":
      return `${(num * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
    case "integer":
      return Math.round(num).toLocaleString("fr-FR");
    case "raw":
      return num.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
}

const KpiCardRender: ComponentType<BlockRenderProps<KpiCardConfig>> = ({ config, state }) => {
  const raw = state.values.get(config.dataId);
  const formatted = formatValue(raw, config.format, config.currencySymbol);
  const className = ["fr-tile"];
  if (config.variant === "highlight") className.push("fr-tile--green-bourgeon");
  return (
    <div className={className.join(" ")}>
      <div className="fr-tile__body">
        <h3 className="fr-tile__title">{config.label}</h3>
        <p className="fr-tile__desc" style={{ fontSize: "2rem", fontWeight: "bold" }}>
          {formatted}
        </p>
        {config.hint ? <p className="fr-tile__desc fr-text--xs">{config.hint}</p> : null}
      </div>
    </div>
  );
};

export const kpiCardBlock: BlockDefinition<KpiCardConfig> = {
  type: "kpi-card",
  configSchema: KpiCardConfig,
  editorMeta: {
    label: "Carte KPI",
    icon: "fr-icon-line-chart-line",
    group: "Résultat",
    description: "Valeur calculée mise en avant (KPI hero) avec libellé et format.",
  },
  readsDataIds: (config) => [config.dataId],
  writesDataIds: () => [],
  render: KpiCardRender,
};
