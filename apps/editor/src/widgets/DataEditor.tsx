import { useState, type JSX } from "react";
import type { Data, DataSource, DataType } from "@g6k4ever/schema";
import { DataDetails } from "./DataDetails.js";

interface DataEditorProps {
  data: Data[];
  onChange: (next: Data[]) => void;
  sources: DataSource[];
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

export function DataEditor({ data, onChange, sources, editable }: DataEditorProps): JSX.Element {
  const [openId, setOpenId] = useState<number | null>(null);

  const nextId = (): number => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.id)) + 1;
  };

  const add = (): void => {
    const id = nextId();
    onChange([...data, { id, name: `donnee${id}`, label: `Donnée ${id}`, type: "text" }]);
  };
  const remove = (i: number): void => onChange(data.filter((_, idx) => idx !== i));
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
            <th style={{ width: "15%" }}>Info</th>
            <th style={{ width: "5%" }}></th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <Row
              key={d.id}
              data={d}
              allData={data}
              isOpen={openId === d.id}
              onToggle={() => setOpenId(openId === d.id ? null : d.id)}
              onUpdate={(next) => update(i, next)}
              onRemove={() => remove(i)}
              sources={sources}
              editable={editable}
            />
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
    </div>
  );
}

interface RowProps {
  data: Data;
  allData: Data[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (next: Data) => void;
  onRemove: () => void;
  sources: DataSource[];
  editable: boolean;
}

function Row({
  data: d,
  allData,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
  sources,
  editable,
}: RowProps): JSX.Element {
  const tags: string[] = [];
  if (d.source) tags.push(`src:${d.source.sourceId}`);
  if (d.content) tags.push("computed");
  if (d.type === "choice" && d.options && d.options.length > 0) tags.push(`${d.options.length} opts`);

  return (
    <>
      <tr>
        <td>{d.id}</td>
        <td>
          <input
            className="fr-input"
            type="text"
            disabled={!editable}
            value={d.name}
            onChange={(e) => onUpdate({ ...d, name: e.target.value })}
          />
        </td>
        <td>
          <input
            className="fr-input"
            type="text"
            disabled={!editable}
            value={d.label}
            onChange={(e) => onUpdate({ ...d, label: e.target.value })}
          />
        </td>
        <td>
          <select
            className="fr-select"
            disabled={!editable}
            value={d.type}
            onChange={(e) => onUpdate({ ...d, type: e.target.value as DataType })}
          >
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </td>
        <td>
          <button
            type="button"
            className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
            onClick={onToggle}
            style={{ textAlign: "left" }}
          >
            {isOpen ? "▾" : "▸"}{" "}
            {tags.length > 0 ? (
              <span className="fr-text--xs">{tags.join(" · ")}</span>
            ) : (
              <span className="fr-text--xs" style={{ opacity: 0.5 }}>Détails</span>
            )}
          </button>
        </td>
        <td>
          <button
            type="button"
            className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
            disabled={!editable}
            onClick={onRemove}
            aria-label={`Supprimer ${d.name}`}
          >
            ✕
          </button>
        </td>
      </tr>
      {isOpen ? (
        <tr>
          <td colSpan={6}>
            <DataDetails
              data={d}
              onChange={onUpdate}
              sources={sources}
              allData={allData}
              editable={editable}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}
