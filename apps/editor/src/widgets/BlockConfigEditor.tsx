import type { JSX } from "react";
import type { Block, Data } from "@g6k4ever/schema";

interface BlockConfigEditorProps {
  block: Block;
  onChange: (next: Block) => void;
  data: Data[];
  editable: boolean;
}

/**
 * Formulaires d'édition de config par type de bloc. Pour les types inconnus,
 * fallback vers un textarea JSON.
 */
export function BlockConfigEditor(props: BlockConfigEditorProps): JSX.Element {
  const { block, onChange, data, editable } = props;
  const config = (block.config ?? {}) as Record<string, unknown>;

  const setConfigField = (field: string, value: unknown): void => {
    onChange({ ...block, config: { ...config, [field]: value } });
  };

  switch (block.type) {
    case "field":
      return <FieldConfigForm block={block} config={config} setField={setConfigField} data={data} editable={editable} />;
    case "text-section":
      return <TextSectionForm config={config} setField={setConfigField} editable={editable} />;
    case "kpi-card":
      return <KpiCardForm config={config} setField={setConfigField} data={data} editable={editable} />;
    case "chapter":
    case "blockinfo":
      return <EnvelopeForm config={config} setField={setConfigField} editable={editable} />;
    case "notification":
      return <NotificationForm config={config} setField={setConfigField} editable={editable} />;
    case "footnote":
      return <FootnoteForm config={config} setField={setConfigField} editable={editable} />;
    case "reset-button":
      return <ResetButtonForm config={config} setField={setConfigField} editable={editable} />;
    default:
      return <RawJsonForm block={block} onChange={onChange} editable={editable} />;
  }
}

// === Forms ===

function FieldConfigForm({
  block,
  config,
  setField,
  data,
  editable,
}: {
  block: Block;
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  data: Data[];
  editable: boolean;
}): JSX.Element {
  const dataId = Number(config["dataId"] ?? data[0]?.id ?? 1);
  const linked = data.find((d) => d.id === dataId);

  return (
    <div>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`fc-data-${block.id}`}>Donnée liée</label>
            <select
              id={`fc-data-${block.id}`}
              className="fr-select"
              disabled={!editable}
              value={dataId}
              onChange={(e) => {
                const id = Number(e.target.value);
                const d = data.find((x) => x.id === id);
                setField("dataId", id);
                if (d) {
                  setField("dataName", d.name);
                  setField("dataType", d.type);
                }
              }}
            >
              {data.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} {d.name} ({d.type})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`fc-label-${block.id}`}>Libellé du champ</label>
            <input
              id={`fc-label-${block.id}`}
              className="fr-input"
              type="text"
              disabled={!editable}
              value={String(config["label"] ?? linked?.label ?? "")}
              onChange={(e) => setField("label", e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`fc-hint-${block.id}`}>Aide / hint (optionnel)</label>
        <input
          id={`fc-hint-${block.id}`}
          className="fr-input"
          type="text"
          disabled={!editable}
          value={String(config["hint"] ?? "")}
          onChange={(e) => setField("hint", e.target.value)}
        />
      </div>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`fc-widget-${block.id}`}>Widget (optionnel)</label>
            <input
              id={`fc-widget-${block.id}`}
              className="fr-input"
              type="text"
              placeholder="range, geoAPILocalities, …"
              disabled={!editable}
              value={String(config["widget"] ?? "")}
              onChange={(e) => setField("widget", e.target.value || undefined)}
            />
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-fieldset__element">
            <div className="fr-checkbox-group">
              <input
                id={`fc-required-${block.id}`}
                type="checkbox"
                disabled={!editable}
                checked={Boolean(config["required"])}
                onChange={(e) => setField("required", e.target.checked)}
              />
              <label className="fr-label" htmlFor={`fc-required-${block.id}`}>Champ requis</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextSectionForm({
  config,
  setField,
  editable,
}: {
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="ts-variant">Variant DSFR</label>
            <select
              id="ts-variant"
              className="fr-select"
              disabled={!editable}
              value={String(config["variant"] ?? "default")}
              onChange={(e) => setField("variant", e.target.value)}
            >
              <option value="default">default</option>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="success">success</option>
            </select>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="ts-title">Titre (optionnel)</label>
            <input
              id="ts-title"
              className="fr-input"
              type="text"
              disabled={!editable}
              value={String(config["title"] ?? "")}
              onChange={(e) => setField("title", e.target.value || undefined)}
            />
          </div>
        </div>
      </div>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="ts-content">
          Contenu (interpolation <code>#&lt;id&gt;</code> autorisée — markdown léger)
        </label>
        <textarea
          id="ts-content"
          className="fr-input"
          rows={6}
          disabled={!editable}
          value={String(config["content"] ?? "")}
          onChange={(e) => setField("content", e.target.value)}
        />
      </div>
    </div>
  );
}

function KpiCardForm({
  config,
  setField,
  data,
  editable,
}: {
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  data: Data[];
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col-12 fr-col-md-4">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="kpi-label">Libellé</label>
          <input
            id="kpi-label"
            className="fr-input"
            type="text"
            disabled={!editable}
            value={String(config["label"] ?? "")}
            onChange={(e) => setField("label", e.target.value)}
          />
        </div>
      </div>
      <div className="fr-col-12 fr-col-md-4">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="kpi-data">Donnée</label>
          <select
            id="kpi-data"
            className="fr-select"
            disabled={!editable}
            value={Number(config["dataId"] ?? data[0]?.id ?? 1)}
            onChange={(e) => setField("dataId", Number(e.target.value))}
          >
            {data.map((d) => (
              <option key={d.id} value={d.id}>#{d.id} {d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="fr-col-12 fr-col-md-4">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="kpi-format">Format</label>
          <select
            id="kpi-format"
            className="fr-select"
            disabled={!editable}
            value={String(config["format"] ?? "raw")}
            onChange={(e) => setField("format", e.target.value)}
          >
            <option value="raw">raw</option>
            <option value="money">money</option>
            <option value="percent">percent</option>
            <option value="integer">integer</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function EnvelopeForm({
  config,
  setField,
  editable,
}: {
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor="env-title">Titre (optionnel)</label>
      <input
        id="env-title"
        className="fr-input"
        type="text"
        disabled={!editable}
        value={String(config["title"] ?? "")}
        onChange={(e) => setField("title", e.target.value || undefined)}
      />
      <p className="fr-text--xs fr-mt-1w" style={{ opacity: 0.75 }}>
        Les blocs enfants se gèrent depuis l'arborescence de l'étape ci-dessus.
      </p>
    </div>
  );
}

function NotificationForm({
  config,
  setField,
  editable,
}: {
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="not-level">Niveau</label>
            <select
              id="not-level"
              className="fr-select"
              disabled={!editable}
              value={String(config["level"] ?? "info")}
              onChange={(e) => setField("level", e.target.value)}
            >
              <option value="info">info</option>
              <option value="success">success</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
            </select>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="not-title">Titre (optionnel)</label>
            <input
              id="not-title"
              className="fr-input"
              type="text"
              disabled={!editable}
              value={String(config["title"] ?? "")}
              onChange={(e) => setField("title", e.target.value || undefined)}
            />
          </div>
        </div>
      </div>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="not-msg">Message</label>
        <textarea
          id="not-msg"
          className="fr-input"
          rows={3}
          disabled={!editable}
          value={String(config["message"] ?? "")}
          onChange={(e) => setField("message", e.target.value)}
        />
      </div>
    </div>
  );
}

function FootnoteForm({
  config,
  setField,
  editable,
}: {
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor="fn-text">
        Texte (interpolation <code>#&lt;id&gt;</code> autorisée)
      </label>
      <textarea
        id="fn-text"
        className="fr-input"
        rows={3}
        disabled={!editable}
        value={String(config["text"] ?? "")}
        onChange={(e) => setField("text", e.target.value)}
      />
    </div>
  );
}

function ResetButtonForm({
  config,
  setField,
  editable,
}: {
  config: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor="rb-label">Libellé du bouton</label>
      <input
        id="rb-label"
        className="fr-input"
        type="text"
        disabled={!editable}
        value={String(config["label"] ?? "Recommencer la simulation")}
        onChange={(e) => setField("label", e.target.value)}
      />
    </div>
  );
}

function RawJsonForm({
  block,
  onChange,
  editable,
}: {
  block: Block;
  onChange: (next: Block) => void;
  editable: boolean;
}): JSX.Element {
  return (
    <div className="fr-input-group">
      <label className="fr-label">
        Config brut (type <code>{block.type}</code> sans formulaire dédié)
      </label>
      <textarea
        className="fr-input"
        style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
        rows={6}
        disabled={!editable}
        value={JSON.stringify(block.config, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value) as unknown;
            onChange({ ...block, config: parsed });
          } catch {
            // ignore, l'utilisateur tape
          }
        }}
      />
    </div>
  );
}
