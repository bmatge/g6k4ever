import type { JSX } from "react";
import type { ColumnSpec } from "@g6k4ever/schema";

interface InlineRowsEditorProps {
  columns: ColumnSpec[];
  rows: Array<Record<string, unknown>>;
  onChange: (next: Array<Record<string, unknown>>) => void;
  editable: boolean;
}

/**
 * Éditeur des lignes d'une source `inline`. Chaque ligne est un objet avec
 * une valeur par colonne. Ajout/suppression de lignes, édition cellule par
 * cellule avec coercion typée (integer/number → number, autres → string brut).
 */
export function InlineRowsEditor({ columns, rows, onChange, editable }: InlineRowsEditorProps): JSX.Element {
  const blankRow = (): Record<string, unknown> => {
    const r: Record<string, unknown> = {};
    for (const c of columns) {
      r[c.name] = c.type === "integer" || c.type === "number" ? 0 : c.type === "boolean" ? false : "";
    }
    return r;
  };

  const add = (): void => onChange([...rows, blankRow()]);
  const remove = (i: number): void => onChange(rows.filter((_, idx) => idx !== i));
  const update = (i: number, col: string, value: unknown): void => {
    const list = [...rows];
    list[i] = { ...list[i], [col]: value };
    onChange(list);
  };

  const inputTypeFor = (col: ColumnSpec): "number" | "date" | "text" => {
    if (col.type === "integer" || col.type === "number") return "number";
    if (col.type === "date") return "date";
    return "text";
  };
  const coerce = (col: ColumnSpec, raw: string): unknown => {
    if (col.type === "integer") return raw === "" ? "" : Number.parseInt(raw, 10);
    if (col.type === "number") return raw === "" ? "" : Number(raw);
    if (col.type === "boolean") return raw === "true";
    return raw;
  };

  return (
    <div className="fr-mb-2w">
      <p className="fr-text--sm" style={{ marginBottom: 4 }}>
        <strong>Lignes</strong> ({rows.length})
      </p>
      {columns.length === 0 ? (
        <p className="fr-text--xs" style={{ opacity: 0.75 }}>
          Définir d'abord les colonnes ci-dessus avant d'ajouter des lignes.
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="fr-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.name}>
                      {c.name} <span className="fr-text--xs" style={{ opacity: 0.6 }}>({c.type})</span>
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.name}>
                        {c.type === "boolean" ? (
                          <select
                            className="fr-select"
                            disabled={!editable}
                            value={String(row[c.name] ?? "false")}
                            onChange={(e) => update(i, c.name, e.target.value === "true")}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            className="fr-input"
                            type={inputTypeFor(c)}
                            disabled={!editable}
                            value={String(row[c.name] ?? "")}
                            onChange={(e) => update(i, c.name, coerce(c, e.target.value))}
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                        disabled={!editable}
                        onClick={() => remove(i)}
                        aria-label="Supprimer la ligne"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="fr-btn fr-btn--sm fr-btn--secondary"
            disabled={!editable}
            onClick={add}
          >
            + Ligne
          </button>
        </>
      )}
    </div>
  );
}
