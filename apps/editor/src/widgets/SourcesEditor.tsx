import type { JSX } from "react";
import type { DataSource, ColumnSpec, ParameterSpec, Data } from "@g6k4ever/schema";
import { InlineRowsEditor } from "./InlineRowsEditor.js";

interface SourcesEditorProps {
  sources: DataSource[];
  onChange: (next: DataSource[]) => void;
  data: Data[];
  editable: boolean;
}

/**
 * Éditeur des datasources. Supporte les 3 types : `inline`, `database`, `api`.
 * Pour Phase 7.2a, focus sur `database` (utilisé par taxeLogementsVacants).
 * Le détail des `rows` d'une `inline` reste en JSON brut pour l'instant.
 */
export function SourcesEditor({ sources, onChange, data, editable }: SourcesEditorProps): JSX.Element {
  const add = (kind: DataSource["kind"]): void => {
    if (kind === "inline") {
      onChange([
        ...sources,
        {
          kind: "inline",
          id: `source${sources.length + 1}`,
          label: "Nouvelle source inline",
          columns: [{ name: "id", type: "text" }, { name: "valeur", type: "text" }],
          rows: [],
          parameters: [],
        },
      ]);
    } else if (kind === "database") {
      onChange([
        ...sources,
        {
          kind: "database",
          id: `source${sources.length + 1}`,
          label: "Nouvelle source SQL",
          connectionId: "ma-connexion",
          query: "SELECT * FROM ma_table WHERE id = %1$s",
          parameters: [],
          columns: [{ name: "id", type: "text" }],
        },
      ]);
    } else {
      onChange([
        ...sources,
        {
          kind: "api",
          id: `source${sources.length + 1}`,
          label: "Nouvelle source API",
          uri: "https://api.example.com/endpoint",
          method: "GET",
          parameters: [],
          cacheTTLSeconds: 0,
        },
      ]);
    }
  };
  const remove = (i: number): void => {
    onChange(sources.filter((_, idx) => idx !== i));
  };
  const update = (i: number, next: DataSource): void => {
    const list = [...sources];
    list[i] = next;
    onChange(list);
  };

  return (
    <div>
      {sources.length === 0 ? (
        <p className="fr-text--sm" style={{ opacity: 0.75 }}>
          Aucune source. Ajoutez une source pour pouvoir alimenter des Data depuis une base ou une API.
        </p>
      ) : null}
      {sources.map((source, i) => (
        <details key={i} className="fr-mb-3w" open={i === 0}>
          <summary className="fr-text--lg">
            <strong>{source.id}</strong> · <code>{source.kind}</code>
          </summary>
          <div className="fr-pl-2w fr-pt-1w">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-4">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`src-id-${i}`}>Identifiant</label>
                  <input
                    id={`src-id-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={source.id}
                    onChange={(e) => update(i, { ...source, id: e.target.value })}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`src-label-${i}`}>Libellé</label>
                  <input
                    id={`src-label-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={source.label}
                    onChange={(e) => update(i, { ...source, label: e.target.value })}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-2" style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary"
                  disabled={!editable}
                  onClick={() => remove(i)}
                >
                  Supprimer
                </button>
              </div>
            </div>

            {source.kind === "database" ? (
              <>
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`src-conn-${i}`}>Connection ID</label>
                  <input
                    id={`src-conn-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={source.connectionId}
                    onChange={(e) => update(i, { ...source, connectionId: e.target.value })}
                  />
                </div>
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`src-query-${i}`}>
                    Requête SQL (paramètres positionnels <code>%1$s</code>, <code>%2$s</code>…)
                  </label>
                  <textarea
                    id={`src-query-${i}`}
                    className="fr-input"
                    style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                    rows={3}
                    disabled={!editable}
                    value={source.query}
                    onChange={(e) => update(i, { ...source, query: e.target.value })}
                  />
                </div>
                <ColumnsTable
                  columns={source.columns}
                  onChange={(columns) => update(i, { ...source, columns })}
                  editable={editable}
                />
                <ParametersTable
                  parameters={source.parameters}
                  onChange={(parameters) => update(i, { ...source, parameters })}
                  data={data}
                  editable={editable}
                />
              </>
            ) : null}

            {source.kind === "api" ? (
              <>
                <div className="fr-grid-row fr-grid-row--gutters">
                  <div className="fr-col-12 fr-col-md-9">
                    <div className="fr-input-group">
                      <label className="fr-label" htmlFor={`src-uri-${i}`}>URI</label>
                      <input
                        id={`src-uri-${i}`}
                        className="fr-input"
                        type="text"
                        disabled={!editable}
                        value={source.uri}
                        onChange={(e) => update(i, { ...source, uri: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="fr-col-12 fr-col-md-3">
                    <div className="fr-input-group">
                      <label className="fr-label" htmlFor={`src-method-${i}`}>Méthode</label>
                      <select
                        id={`src-method-${i}`}
                        className="fr-select"
                        disabled={!editable}
                        value={source.method}
                        onChange={(e) => update(i, { ...source, method: e.target.value as "GET" | "POST" })}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`src-ttl-${i}`}>Cache TTL (secondes, 0 = pas de cache)</label>
                  <input
                    id={`src-ttl-${i}`}
                    className="fr-input"
                    type="number"
                    min={0}
                    disabled={!editable}
                    value={source.cacheTTLSeconds}
                    onChange={(e) => update(i, { ...source, cacheTTLSeconds: Number(e.target.value) })}
                  />
                </div>
                <ParametersTable
                  parameters={source.parameters}
                  onChange={(parameters) => update(i, { ...source, parameters })}
                  data={data}
                  editable={editable}
                />
              </>
            ) : null}

            {source.kind === "inline" ? (
              <>
                <ColumnsTable
                  columns={source.columns}
                  onChange={(columns) => update(i, { ...source, columns })}
                  editable={editable}
                />
                <ParametersTable
                  parameters={source.parameters}
                  onChange={(parameters) => update(i, { ...source, parameters })}
                  data={data}
                  editable={editable}
                />
                <InlineRowsEditor
                  columns={source.columns}
                  rows={source.rows}
                  onChange={(rows) => update(i, { ...source, rows })}
                  editable={editable}
                />
              </>
            ) : null}
          </div>
        </details>
      ))}
      <div className="fr-mt-2w">
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--secondary fr-mr-1w"
          disabled={!editable}
          onClick={() => add("inline")}
        >
          + Inline
        </button>
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--secondary fr-mr-1w"
          disabled={!editable}
          onClick={() => add("database")}
        >
          + Database (SQL)
        </button>
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--secondary"
          disabled={!editable}
          onClick={() => add("api")}
        >
          + API
        </button>
      </div>
    </div>
  );
}

function ColumnsTable({
  columns,
  onChange,
  editable,
}: {
  columns: ColumnSpec[];
  onChange: (next: ColumnSpec[]) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-mb-2w">
      <p className="fr-text--sm" style={{ marginBottom: 4 }}><strong>Colonnes</strong></p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {columns.map((c, i) => (
            <tr key={i}>
              <td>
                <input
                  className="fr-input"
                  type="text"
                  disabled={!editable}
                  value={c.name}
                  onChange={(e) => {
                    const list = [...columns]; list[i] = { ...c, name: e.target.value }; onChange(list);
                  }}
                />
              </td>
              <td>
                <select
                  className="fr-select"
                  disabled={!editable}
                  value={c.type}
                  onChange={(e) => {
                    const list = [...columns]; list[i] = { ...c, type: e.target.value as ColumnSpec["type"] }; onChange(list);
                  }}
                >
                  {["integer","number","text","boolean","date"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => onChange(columns.filter((_, idx) => idx !== i))}
                  aria-label="Supprimer la colonne"
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
        className="fr-btn fr-btn--sm fr-btn--secondary"
        disabled={!editable}
        onClick={() => onChange([...columns, { name: `col${columns.length + 1}`, type: "text" }])}
      >
        + Colonne
      </button>
    </div>
  );
}

function ParametersTable({
  parameters,
  onChange,
  data,
  editable,
}: {
  parameters: ParameterSpec[];
  onChange: (next: ParameterSpec[]) => void;
  data: Data[];
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-mb-2w">
      <p className="fr-text--sm" style={{ marginBottom: 4 }}><strong>Paramètres</strong> (bornés aux Data)</p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>Nom param</th>
            <th>Position</th>
            <th>Liée à</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((p, i) => (
            <tr key={i}>
              <td>
                <input
                  className="fr-input"
                  type="text"
                  disabled={!editable}
                  value={p.name}
                  onChange={(e) => {
                    const list = [...parameters]; list[i] = { ...p, name: e.target.value }; onChange(list);
                  }}
                />
              </td>
              <td>
                <input
                  className="fr-input"
                  type="number"
                  min={1}
                  disabled={!editable}
                  value={p.position ?? ""}
                  onChange={(e) => {
                    const list = [...parameters];
                    list[i] = { ...p, position: e.target.value === "" ? undefined : Number(e.target.value) };
                    onChange(list);
                  }}
                />
              </td>
              <td>
                <select
                  className="fr-select"
                  disabled={!editable}
                  value={p.bindToDataId ?? ""}
                  onChange={(e) => {
                    const list = [...parameters];
                    list[i] = { ...p, bindToDataId: e.target.value === "" ? undefined : Number(e.target.value) };
                    onChange(list);
                  }}
                >
                  <option value="">—</option>
                  {data.map((d) => (
                    <option key={d.id} value={d.id}>#{d.id} {d.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => onChange(parameters.filter((_, idx) => idx !== i))}
                  aria-label="Supprimer le paramètre"
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
        className="fr-btn fr-btn--sm fr-btn--secondary"
        disabled={!editable}
        onClick={() =>
          onChange([
            ...parameters,
            { name: `param${parameters.length + 1}`, type: "text", position: parameters.length + 1 },
          ])
        }
      >
        + Paramètre
      </button>
    </div>
  );
}
