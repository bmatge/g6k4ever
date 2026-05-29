import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `breakdown-table` — décomposition de calcul en tableau 2 colonnes
 * (libellé + valeur formatée). Utilisé pour les simulateurs TCO de
 * portail-elec (voiture, poids-lourd) : affichage des composantes du coût total.
 *
 * Chaque ligne référence une Data par son id et un format ; la dernière ligne
 * peut être mise en évidence (`emphasis: true`) pour le TOTAL.
 */
const Row = z.object({
  label: z.string().min(1),
  dataId: z.number().int().positive(),
  format: z.enum(["raw", "money", "percent", "integer"]).default("raw"),
  /** Mise en avant (utilisé pour le total). */
  emphasis: z.boolean().default(false),
  /** Indentation visuelle (sous-rubrique). */
  indent: z.number().int().min(0).default(0),
});

export const BreakdownTableConfig = z.object({
  title: z.string().optional(),
  currencySymbol: z.string().default("€"),
  rows: z.array(Row).default([]),
});
export type BreakdownTableConfig = z.infer<typeof BreakdownTableConfig>;

function formatValue(
  value: unknown,
  format: "raw" | "money" | "percent" | "integer" | undefined,
  currencySymbol: string | undefined,
): string {
  if (value === undefined || value === null) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const symbol = currencySymbol ?? "€";
  const fmt = format ?? "raw";
  switch (fmt) {
    case "money":
      return `${num.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${symbol}`;
    case "percent":
      return `${(num * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
    case "integer":
      return Math.round(num).toLocaleString("fr-FR");
    case "raw":
      return num.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
}

const BreakdownTableRender: ComponentType<BlockRenderProps<BreakdownTableConfig>> = ({ config, state }) => {
  return (
    <div className="fr-mt-2w">
      {config.title ? <h3 className="fr-h5">{config.title}</h3> : null}
      <table className="fr-table fr-table--bordered" style={{ width: "100%" }}>
        <tbody>
          {config.rows.map((row, i) => {
            const raw = state.values.get(row.dataId);
            const formatted = formatValue(raw, row.format, config.currencySymbol);
            const rowStyle: React.CSSProperties = row.emphasis
              ? { fontWeight: "bold", borderTop: "2px solid var(--border-action-high-blue-france)" }
              : {};
            return (
              <tr key={i} style={rowStyle}>
                <td style={{ paddingLeft: `${1 + row.indent * 1.5}rem` }}>{row.label}</td>
                <td style={{ textAlign: "right" }}>{formatted}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const breakdownTableBlock: BlockDefinition<BreakdownTableConfig> = {
  type: "breakdown-table",
  configSchema: BreakdownTableConfig,
  editorMeta: {
    label: "Tableau de décomposition",
    icon: "fr-icon-checkbox-line",
    group: "Résultat",
    description: "Décomposition d'un calcul en tableau 2 colonnes (libellé + valeur formatée).",
  },
  readsDataIds: (config) => config.rows.map((r) => r.dataId),
  writesDataIds: () => [],
  render: BreakdownTableRender,
};
