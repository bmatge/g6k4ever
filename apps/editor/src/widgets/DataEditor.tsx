import type { JSX } from "react";
import type { Data, DataType } from "@g6k4ever/schema";

interface DataEditorProps {
  data: Data[];
  onChange: (next: Data[]) => void;
  editable: boolean;
}

const DATA_TYPES: DataType[] = [
  "integer",
  "number",
  "money",
  "percent",
  "boolean",
  "choice",
  "text",
  "textarea",
  "date",
  "month",
  "year",
];

/**
 * Tableau d'édition des Data — ajout, suppression, édition de tous les
 * attributs principaux (id, name, label, type).
 *
 * Édition fine (options pour `choice`, content expression, source) : à venir
 * en Phase 7.2b via un panneau de détail. Pour la prochaine session.
 */
export function DataEditor({ data, onChange, editable }: DataEditorProps): JSX.Element {
  const nextId = (): number => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.id)) + 1;
  };

  const add = (): void => {
    const id = nextId();
    onChange([
      ...data,
      { id, name: `donnee${id}`, label: `Donnée ${id}`, type: "text" },
    ]);
  };
  const remove = (i: number): void => {
    onChange(data.filter((_, idx) => idx !== i));
  };
  const update = (i: number, next: Data): void => {
    const list = [...data];
    list[i] = next;
    onChange(list);
  };

  return (
    <div>
      <table className="fr-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: "8%" }}>#id</th>
            <th style={{ width: "22%" }}>Nom (slug)</th>
            <th style={{ width: "30%" }}>Libellé</th>
            <th style={{ width: "20%" }}>Type</th>
            <th style={{ width: "15%" }}>Source</th>
            <th style={{ width: "5%" }}></th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>
                <input
                  className="fr-input"
                  type="text"
                  disabled={!editable}
                  value={d.name}
                  onChange={(e) => update(i, { ...d, name: e.target.value })}
                />
              </td>
              <td>
                <input
                  className="fr-input"
                  type="text"
                  disabled={!editable}
                  value={d.label}
                  onChange={(e) => update(i, { ...d, label: e.target.value })}
                />
              </td>
              <td>
                <select
                  className="fr-select"
                  disabled={!editable}
                  value={d.type}
                  onChange={(e) => update(i, { ...d, type: e.target.value as DataType })}
                >
                  {DATA_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td>
                <span className="fr-text--xs">
                  {d.source ? `→ ${d.source.sourceId}.${d.source.returnPath ?? "?"}` : "—"}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => remove(i)}
                  aria-label={`Supprimer ${d.name}`}
                  title="Supprimer"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--secondary fr-mt-1w"
        disabled={!editable}
        onClick={add}
      >
        + Nouvelle donnée
      </button>
      <p className="fr-text--xs fr-mt-2w" style={{ opacity: 0.7 }}>
        Pour éditer les détails avancés (options de `choice`, expression `content`,
        liaison à une source) : utiliser l'onglet « JSON brut ». Panneau détaillé
        à venir en Phase 7.2b.
      </p>
    </div>
  );
}
