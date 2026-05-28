import { useState, type JSX } from "react";
import type { Step, Block, Data, Simulator } from "@g6k4ever/schema";
import { createStandardRegistry as createBlocksRegistry } from "@g6k4ever/blocks";
import { BlockConfigEditor } from "./BlockConfigEditor.js";

interface StepsEditorProps {
  steps: Simulator["steps"];
  onChange: (next: Simulator["steps"]) => void;
  data: Data[];
  editable: boolean;
}

const registry = createBlocksRegistry();

let blockCounter = 0;
const nextBlockId = (typeHint: string): string => `${typeHint}-${++blockCounter}-${Math.floor(Math.random() * 9999).toString(36)}`;

const blankStep = (n: number): Step => ({
  id: n,
  name: `step${n}`,
  label: `Étape ${n}`,
  blocks: [],
});

const blankBlock = (type: string): Block => ({
  id: nextBlockId(type),
  type,
  config: {},
});

/**
 * Éditeur des étapes (Steps) et de leurs blocs imbriqués.
 *
 * Fonctionnalités :
 *   - Ajout / suppression / réordonnancement d'étapes
 *   - Pour chaque étape : palette de blocs (sélecteur de type) pour ajouter,
 *     liste ordonnée avec déplacement haut/bas, suppression, édition de config
 *     via `<BlockConfigEditor>`
 *   - Support 1 niveau de nesting (envelope `blockinfo`/`chapter` peut contenir
 *     d'autres blocs via leur `config.blocks`)
 */
export function StepsEditor({ steps, onChange, data, editable }: StepsEditorProps): JSX.Element {
  const nextStepId = (): number => {
    if (steps.length === 0) return 1;
    return Math.max(...steps.map((s) => (typeof s.id === "number" ? s.id : 0))) + 1;
  };

  const addStep = (): void => {
    const id = nextStepId();
    onChange([...steps, blankStep(id)]);
  };
  const removeStep = (i: number): void => {
    onChange(steps.filter((_, idx) => idx !== i));
  };
  const moveStep = (i: number, delta: -1 | 1): void => {
    const j = i + delta;
    if (j < 0 || j >= steps.length) return;
    const list = [...steps];
    [list[i], list[j]] = [list[j]!, list[i]!];
    onChange(list);
  };
  const updateStep = (i: number, next: Step): void => {
    const list = [...steps];
    list[i] = next;
    onChange(list);
  };

  return (
    <div>
      {steps.map((step, i) => (
        <details key={String(step.id)} className="fr-mb-3w" open={i === 0}>
          <summary className="fr-text--lg">
            <strong>{step.label}</strong> · <code>{step.name}</code> · {step.blocks.length} bloc{step.blocks.length > 1 ? "s" : ""}
          </summary>
          <div className="fr-pl-2w fr-pt-1w">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-4">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`step-name-${i}`}>Nom (slug)</label>
                  <input
                    id={`step-name-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={step.name}
                    onChange={(e) => updateStep(i, { ...step, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`step-label-${i}`}>Libellé</label>
                  <input
                    id={`step-label-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={step.label}
                    onChange={(e) => updateStep(i, { ...step, label: e.target.value })}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-2" style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary"
                  disabled={!editable}
                  onClick={() => moveStep(i, -1)}
                  aria-label="Déplacer l'étape vers le haut"
                  title="Monter"
                >↑</button>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary fr-ml-1w"
                  disabled={!editable}
                  onClick={() => moveStep(i, +1)}
                  aria-label="Déplacer l'étape vers le bas"
                  title="Descendre"
                >↓</button>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary fr-ml-1w"
                  disabled={!editable}
                  onClick={() => removeStep(i)}
                  aria-label="Supprimer l'étape"
                  title="Supprimer"
                >✕</button>
              </div>
            </div>

            <BlocksList
              blocks={step.blocks}
              onChange={(blocks) => updateStep(i, { ...step, blocks })}
              data={data}
              editable={editable}
              depth={0}
            />
          </div>
        </details>
      ))}
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--secondary fr-mt-2w"
        disabled={!editable}
        onClick={addStep}
      >
        + Nouvelle étape
      </button>
    </div>
  );
}

interface BlocksListProps {
  blocks: Block[];
  onChange: (next: Block[]) => void;
  data: Data[];
  editable: boolean;
  depth: number;
}

const MAX_NESTING_DEPTH = 3;

function BlocksList({ blocks, onChange, data, editable, depth }: BlocksListProps): JSX.Element {
  const [pickerType, setPickerType] = useState<string>("");

  const add = (): void => {
    if (!pickerType) return;
    onChange([...blocks, blankBlock(pickerType)]);
    setPickerType("");
  };
  const remove = (i: number): void => {
    onChange(blocks.filter((_, idx) => idx !== i));
  };
  const move = (i: number, delta: -1 | 1): void => {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return;
    const list = [...blocks];
    [list[i], list[j]] = [list[j]!, list[i]!];
    onChange(list);
  };
  const update = (i: number, next: Block): void => {
    const list = [...blocks];
    list[i] = next;
    onChange(list);
  };

  return (
    <div
      className="fr-mt-2w"
      style={{
        borderLeft: depth > 0 ? "2px solid var(--border-default-blue-france)" : "none",
        paddingLeft: depth > 0 ? 12 : 0,
      }}
    >
      <p className="fr-text--sm" style={{ marginBottom: 4 }}>
        <strong>Blocs</strong> {depth > 0 ? `(niveau ${depth})` : ""}
      </p>
      {blocks.map((block, i) => {
        const def = registry.get(block.type);
        const cfg = (block.config ?? {}) as { blocks?: Block[] };
        const isEnvelope = block.type === "chapter" || block.type === "blockinfo";
        return (
          <div
            key={block.id}
            className="fr-mb-1w"
            style={{ border: "1px solid var(--border-default-grey)", borderRadius: 4, padding: 8 }}
          >
            <div className="fr-grid-row fr-grid-row--middle fr-mb-1w">
              <div className="fr-col">
                <strong>{def?.editorMeta.label ?? block.type}</strong>{" "}
                <code className="fr-text--xs">{block.id}</code>
              </div>
              <div className="fr-col-auto">
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => move(i, -1)}
                  aria-label="Monter"
                >↑</button>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => move(i, +1)}
                  aria-label="Descendre"
                >↓</button>
                <button
                  type="button"
                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                  disabled={!editable}
                  onClick={() => remove(i)}
                  aria-label="Supprimer"
                >✕</button>
              </div>
            </div>
            <div className="fr-input-group fr-mb-1w">
              <label className="fr-label" htmlFor={`block-id-${block.id}`}>Identifiant du bloc</label>
              <input
                id={`block-id-${block.id}`}
                className="fr-input"
                type="text"
                disabled={!editable}
                value={block.id}
                onChange={(e) => update(i, { ...block, id: e.target.value })}
              />
            </div>
            <BlockConfigEditor block={block} onChange={(b) => update(i, b)} data={data} editable={editable} />
            {isEnvelope && depth < MAX_NESTING_DEPTH ? (
              <BlocksList
                blocks={Array.isArray(cfg.blocks) ? cfg.blocks : []}
                onChange={(children) =>
                  update(i, { ...block, config: { ...cfg, blocks: children } })
                }
                data={data}
                editable={editable}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}

      <div className="fr-grid-row fr-grid-row--gutters fr-mt-1w fr-grid-row--middle">
        <div className="fr-col-auto">
          <select
            className="fr-select"
            disabled={!editable}
            value={pickerType}
            onChange={(e) => setPickerType(e.target.value)}
          >
            <option value="">— Choisir un bloc —</option>
            {registry.list().map((d) => (
              <option key={d.type} value={d.type}>
                {d.editorMeta.label} ({d.type})
              </option>
            ))}
          </select>
        </div>
        <div className="fr-col-auto">
          <button
            type="button"
            className="fr-btn fr-btn--sm"
            disabled={!editable || !pickerType}
            onClick={add}
          >
            + Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
