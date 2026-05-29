import type { JSX } from "react";
import type { Data, DataSource } from "@g6k4ever/schema";

interface DataDetailsProps {
  data: Data;
  onChange: (next: Data) => void;
  sources: DataSource[];
  editable: boolean;
}

/**
 * Panneau détaillé d'une Data : liaison à une source, expression `content`,
 * options pour `choice`, widget hint, default/min/max.
 *
 * Le détail le plus important (et le plus utilisé) est la **liaison à une
 * source** : permet à une Data d'être résolue depuis une source SQL/inline/API.
 */
export function DataDetails({ data, onChange, sources, editable }: DataDetailsProps): JSX.Element {
  const sourceDef = data.source ? sources.find((s) => s.id === data.source!.sourceId) : null;
  const columnNames = sourceDef
    ? sourceDef.kind === "inline" || sourceDef.kind === "database"
      ? sourceDef.columns.map((c) => c.name)
      : []
    : [];

  const linkSource = (sourceId: string): void => {
    if (!sourceId) {
      const { source: _drop, ...rest } = data;
      onChange(rest);
      return;
    }
    onChange({ ...data, source: { sourceId, ...(data.source?.returnPath ? { returnPath: data.source.returnPath } : {}) } });
  };

  const setReturnPath = (returnPath: string): void => {
    if (!data.source) return;
    onChange({
      ...data,
      source: { ...data.source, ...(returnPath ? { returnPath } : {}) },
    });
  };

  return (
    <div
      className="fr-mt-1w fr-mb-2w fr-p-2w"
      style={{ background: "var(--background-default-grey)", border: "1px solid var(--border-default-grey)", borderRadius: 4 }}
    >
      <p className="fr-text--sm" style={{ marginBottom: 4 }}>
        <strong>Détails de #{data.id} <code>{data.name}</code></strong>
      </p>

      {/* Source */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-1w">
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`dd-source-${data.id}`}>Liée à une source</label>
            <select
              id={`dd-source-${data.id}`}
              className="fr-select"
              disabled={!editable}
              value={data.source?.sourceId ?? ""}
              onChange={(e) => linkSource(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.id} ({s.kind})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`dd-returnpath-${data.id}`}>Colonne (returnPath)</label>
            {columnNames.length > 0 ? (
              <select
                id={`dd-returnpath-${data.id}`}
                className="fr-select"
                disabled={!editable || !data.source}
                value={data.source?.returnPath ?? ""}
                onChange={(e) => setReturnPath(e.target.value)}
              >
                <option value="">— Ligne entière —</option>
                {columnNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                id={`dd-returnpath-${data.id}`}
                className="fr-input"
                type="text"
                placeholder="ex. nomCommune"
                disabled={!editable || !data.source}
                value={data.source?.returnPath ?? ""}
                onChange={(e) => setReturnPath(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Content expression */}
      <div className="fr-input-group fr-mb-1w">
        <label className="fr-label" htmlFor={`dd-content-${data.id}`}>
          Expression <code>content</code> (calcul automatique — ex. <code>#100 + #101</code>)
        </label>
        <input
          id={`dd-content-${data.id}`}
          className="fr-input"
          type="text"
          placeholder="Expression jsep avec #id"
          disabled={!editable}
          value={data.content ?? ""}
          onChange={(e) => onChange({ ...data, content: e.target.value || undefined })}
        />
      </div>

      {/* Default / Min / Max */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-1w">
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`dd-default-${data.id}`}>Valeur par défaut</label>
            <input
              id={`dd-default-${data.id}`}
              className="fr-input"
              type="text"
              disabled={!editable}
              value={data.default ?? ""}
              onChange={(e) => onChange({ ...data, default: e.target.value || undefined })}
            />
          </div>
        </div>
        <div className="fr-col-6 fr-col-md-4">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`dd-min-${data.id}`}>Min</label>
            <input
              id={`dd-min-${data.id}`}
              className="fr-input"
              type="text"
              disabled={!editable}
              value={data.min ?? ""}
              onChange={(e) => onChange({ ...data, min: e.target.value || undefined })}
            />
          </div>
        </div>
        <div className="fr-col-6 fr-col-md-4">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`dd-max-${data.id}`}>Max</label>
            <input
              id={`dd-max-${data.id}`}
              className="fr-input"
              type="text"
              disabled={!editable}
              value={data.max ?? ""}
              onChange={(e) => onChange({ ...data, max: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>

      {/* Choice options */}
      {data.type === "choice" ? (
        <ChoiceOptionsEditor
          options={data.options ?? []}
          onChange={(options) => onChange({ ...data, options })}
          editable={editable}
        />
      ) : null}

      {/* Widget hint */}
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`dd-widget-${data.id}`}>
          Widget (optionnel — ex. <code>geoAPIZipCodeGetInfo</code>, <code>abDatepicker</code>)
        </label>
        <input
          id={`dd-widget-${data.id}`}
          className="fr-input"
          type="text"
          disabled={!editable}
          value={data.widget ?? ""}
          onChange={(e) => onChange({ ...data, widget: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

function ChoiceOptionsEditor({
  options,
  onChange,
  editable,
}: {
  options: Array<{ value: string | number; label: string }>;
  onChange: (next: Array<{ value: string | number; label: string }>) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-mb-1w">
      <p className="fr-text--sm" style={{ marginBottom: 4 }}><strong>Options du choix</strong></p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>Valeur</th>
            <th>Libellé</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt, i) => (
            <tr key={i}>
              <td>
                <input
                  className="fr-input"
                  type="text"
                  disabled={!editable}
                  value={String(opt.value)}
                  onChange={(e) => {
                    const list = [...options];
                    list[i] = { ...opt, value: e.target.value };
                    onChange(list);
                  }}
                />
              </td>
              <td>
                <input
                  className="fr-input"
                  type="text"
                  disabled={!editable}
                  value={opt.label}
                  onChange={(e) => {
                    const list = [...options];
                    list[i] = { ...opt, label: e.target.value };
                    onChange(list);
                  }}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => onChange(options.filter((_, idx) => idx !== i))}
                  aria-label="Supprimer l'option"
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
        onClick={() => onChange([...options, { value: `opt${options.length + 1}`, label: `Option ${options.length + 1}` }])}
      >
        + Option
      </button>
    </div>
  );
}
