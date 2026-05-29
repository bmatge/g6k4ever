import { useState, useMemo, type JSX } from "react";
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
const ENVELOPE_TYPES = new Set(["chapter", "blockinfo"]);

let blockCounter = 0;
const nextBlockId = (typeHint: string): string =>
  `${typeHint}-${++blockCounter}-${Math.floor(Math.random() * 9999).toString(36)}`;

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
 * Path dans l'arborescence des steps.
 * - `[stepIdx]` désigne une step entière
 * - `[stepIdx, blockIdx]` désigne un bloc de cette step
 * - `[stepIdx, blockIdx, childIdx, ...]` descend dans les sous-blocs (envelopes
 *   `chapter`/`blockinfo`).
 */
type Path = number[];

const pathEqual = (a: Path, b: Path): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const pathIsAncestor = (parent: Path, child: Path): boolean =>
  parent.length < child.length && parent.every((v, i) => v === child[i]);

/** Récupère le noeud (Step ou Block) à un path donné. Retourne `null` si invalide. */
function getNodeAt(path: Path, steps: Step[]): Step | Block | null {
  if (path.length === 0) return null;
  const step = steps[path[0]!];
  if (!step) return null;
  if (path.length === 1) return step;
  let blocks: Block[] = step.blocks;
  let cursor: Block | null = null;
  for (let i = 1; i < path.length; i++) {
    cursor = blocks[path[i]!] ?? null;
    if (!cursor) return null;
    const cfg = (cursor.config ?? {}) as { blocks?: Block[] };
    blocks = Array.isArray(cfg.blocks) ? cfg.blocks : [];
  }
  return cursor;
}

/** Construit le breadcrumb labellisé d'un path. */
function buildBreadcrumb(path: Path, steps: Step[]): { path: Path; label: string }[] {
  const out: { path: Path; label: string }[] = [];
  for (let i = 0; i < path.length; i++) {
    const sub = path.slice(0, i + 1);
    const node = getNodeAt(sub, steps);
    if (!node) break;
    const isStep = i === 0;
    const lbl = isStep
      ? (node as Step).label
      : registry.get((node as Block).type)?.editorMeta.label ?? (node as Block).type;
    out.push({ path: sub, label: lbl });
  }
  return out;
}

/** Met à jour une step entière à un path stepIdx. */
function setStepAt(steps: Step[], stepIdx: number, fn: (s: Step) => Step): Step[] {
  return steps.map((s, i) => (i === stepIdx ? fn(s) : s));
}

/**
 * Met à jour le bloc situé à path (longueur >= 2). Retourne les nouvelles steps.
 */
function updateBlockAt(steps: Step[], path: Path, fn: (b: Block) => Block): Step[] {
  if (path.length < 2) return steps;
  return setStepAt(steps, path[0]!, (step) => ({
    ...step,
    blocks: mapBlocksAtPath(step.blocks, path.slice(1), fn),
  }));
}

/** Helper récursif pour `updateBlockAt`. */
function mapBlocksAtPath(
  blocks: Block[],
  relPath: number[],
  fn: (b: Block) => Block,
): Block[] {
  if (relPath.length === 0) return blocks;
  const head = relPath[0]!;
  const rest = relPath.slice(1);
  return blocks.map((b, i) => {
    if (i !== head) return b;
    if (rest.length === 0) return fn(b);
    const cfg = (b.config ?? {}) as { blocks?: Block[] };
    const children = Array.isArray(cfg.blocks) ? cfg.blocks : [];
    return { ...b, config: { ...cfg, blocks: mapBlocksAtPath(children, rest, fn) } };
  });
}

/** Supprime le noeud à path. Retourne les nouvelles steps. */
function removeAt(steps: Step[], path: Path): Step[] {
  if (path.length === 0) return steps;
  if (path.length === 1) return steps.filter((_, i) => i !== path[0]);
  return setStepAt(steps, path[0]!, (step) => ({
    ...step,
    blocks: removeBlocksAt(step.blocks, path.slice(1)),
  }));
}

function removeBlocksAt(blocks: Block[], relPath: number[]): Block[] {
  if (relPath.length === 0) return blocks;
  const head = relPath[0]!;
  const rest = relPath.slice(1);
  if (rest.length === 0) return blocks.filter((_, i) => i !== head);
  return blocks.map((b, i) => {
    if (i !== head) return b;
    const cfg = (b.config ?? {}) as { blocks?: Block[] };
    const children = Array.isArray(cfg.blocks) ? cfg.blocks : [];
    return { ...b, config: { ...cfg, blocks: removeBlocksAt(children, rest) } };
  });
}

/** Déplace le noeud à path de delta positions au sein de son parent. */
function moveAt(steps: Step[], path: Path, delta: -1 | 1): Step[] {
  if (path.length === 0) return steps;
  if (path.length === 1) {
    const i = path[0]!;
    const j = i + delta;
    if (j < 0 || j >= steps.length) return steps;
    const next = [...steps];
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  }
  return setStepAt(steps, path[0]!, (step) => ({
    ...step,
    blocks: moveBlocksAt(step.blocks, path.slice(1), delta),
  }));
}

function moveBlocksAt(blocks: Block[], relPath: number[], delta: -1 | 1): Block[] {
  if (relPath.length === 0) return blocks;
  const head = relPath[0]!;
  const rest = relPath.slice(1);
  if (rest.length === 0) {
    const j = head + delta;
    if (j < 0 || j >= blocks.length) return blocks;
    const next = [...blocks];
    [next[head], next[j]] = [next[j]!, next[head]!];
    return next;
  }
  return blocks.map((b, i) => {
    if (i !== head) return b;
    const cfg = (b.config ?? {}) as { blocks?: Block[] };
    const children = Array.isArray(cfg.blocks) ? cfg.blocks : [];
    return { ...b, config: { ...cfg, blocks: moveBlocksAt(children, rest, delta) } };
  });
}

/** Ajoute un bloc enfant au noeud (envelope) à `parentPath`. Retourne path du nouveau bloc. */
function appendBlockAt(
  steps: Step[],
  parentPath: Path,
  newBlock: Block,
): { steps: Step[]; newPath: Path } {
  if (parentPath.length === 1) {
    const stepIdx = parentPath[0]!;
    const step = steps[stepIdx]!;
    const next = setStepAt(steps, stepIdx, (s) => ({ ...s, blocks: [...s.blocks, newBlock] }));
    return { steps: next, newPath: [stepIdx, step.blocks.length] };
  }
  // Bloc envelope : on ajoute dans config.blocks
  const next = updateBlockAt(steps, parentPath, (b) => {
    const cfg = (b.config ?? {}) as { blocks?: Block[] };
    const children = Array.isArray(cfg.blocks) ? cfg.blocks : [];
    return { ...b, config: { ...cfg, blocks: [...children, newBlock] } };
  });
  const parentNode = getNodeAt(parentPath, steps) as Block | null;
  const parentChildren =
    (parentNode?.config as { blocks?: Block[] } | undefined)?.blocks ?? [];
  return { steps: next, newPath: [...parentPath, parentChildren.length] };
}

/** Compte récursivement le nombre de blocs (y compris imbriqués) d'une step. */
function countBlocks(blocks: Block[]): number {
  let n = blocks.length;
  for (const b of blocks) {
    const cfg = (b.config ?? {}) as { blocks?: Block[] };
    if (Array.isArray(cfg.blocks)) n += countBlocks(cfg.blocks);
  }
  return n;
}

// ============================================================================
// Composant principal — layout 2 colonnes
// ============================================================================

export function StepsEditor({ steps, onChange, data, editable }: StepsEditorProps): JSX.Element {
  const [selectedPath, setSelectedPath] = useState<Path>(
    steps.length > 0 ? [0] : [],
  );

  const selectedNode = useMemo(() => getNodeAt(selectedPath, steps), [selectedPath, steps]);

  const addStep = (): void => {
    const id = steps.length > 0
      ? Math.max(...steps.map((s) => (typeof s.id === "number" ? s.id : 0))) + 1
      : 1;
    onChange([...steps, blankStep(id)]);
    setSelectedPath([steps.length]);
  };

  const handleRemove = (path: Path): void => {
    const next = removeAt(steps, path);
    onChange(next);
    // Si on supprimait l'élément sélectionné ou un ancêtre, retour à la racine.
    if (pathEqual(path, selectedPath) || pathIsAncestor(path, selectedPath)) {
      setSelectedPath(next.length > 0 ? [0] : []);
    }
  };

  const handleMove = (path: Path, delta: -1 | 1): void => {
    onChange(moveAt(steps, path, delta));
    // Mise à jour du path sélectionné si on déplace l'élément sélectionné
    if (pathEqual(path, selectedPath)) {
      const last = selectedPath.length - 1;
      const newIdx = selectedPath[last]! + delta;
      const next = [...selectedPath];
      next[last] = newIdx;
      setSelectedPath(next);
    }
  };

  return (
    <div className="fr-grid-row fr-grid-row--gutters" style={{ minHeight: "60vh" }}>
      {/* Outline arborescent — gauche */}
      <aside className="fr-col-12 fr-col-md-4" style={{ minWidth: 0 }}>
        <div
          style={{
            border: "1px solid var(--border-default-grey)",
            borderRadius: 4,
            backgroundColor: "var(--background-default-white)",
            position: "sticky",
            top: "1rem",
            maxHeight: "calc(100vh - 4rem)",
            overflow: "auto",
          }}
        >
          <div className="fr-p-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <p className="fr-text--sm fr-mb-0" style={{ fontWeight: 600 }}>Plan du simulateur</p>
            <p className="fr-text--xs" style={{ opacity: 0.7, margin: 0 }}>
              Cliquez sur une étape ou un bloc pour l'éditer à droite.
            </p>
          </div>

          <ul className="fr-p-2w" style={{ listStyle: "none", margin: 0 }}>
            {steps.map((step, i) => (
              <OutlineStep
                key={String(step.id)}
                step={step}
                stepPath={[i]}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            ))}
          </ul>

          <div className="fr-px-2w fr-pb-2w">
            <button
              type="button"
              className="fr-btn fr-btn--sm fr-btn--secondary fr-icon-add-line fr-btn--icon-left"
              disabled={!editable}
              onClick={addStep}
              style={{ width: "100%" }}
            >
              Nouvelle étape
            </button>
          </div>
        </div>
      </aside>

      {/* Détail — droite */}
      <main className="fr-col-12 fr-col-md-8" style={{ minWidth: 0 }}>
        {selectedNode === null ? (
          <div
            className="fr-p-4w"
            style={{
              border: "1px dashed var(--border-default-grey)",
              borderRadius: 4,
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            <p className="fr-icon-arrow-left-line" aria-hidden="true" style={{ fontSize: 32 }} />
            <p>Sélectionnez une étape ou un bloc dans le plan pour l'éditer.</p>
          </div>
        ) : (
          <NodeDetail
            selectedPath={selectedPath}
            steps={steps}
            onChange={onChange}
            onSelect={setSelectedPath}
            onRemove={handleRemove}
            onMove={handleMove}
            onAddBlock={(parentPath, type) => {
              const { steps: nextSteps, newPath } = appendBlockAt(steps, parentPath, blankBlock(type));
              onChange(nextSteps);
              setSelectedPath(newPath);
            }}
            data={data}
            editable={editable}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Outline (gauche)
// ============================================================================

interface OutlineStepProps {
  step: Step;
  stepPath: Path;
  selectedPath: Path;
  onSelect: (p: Path) => void;
}

function OutlineStep({ step, stepPath, selectedPath, onSelect }: OutlineStepProps): JSX.Element {
  const total = countBlocks(step.blocks);
  const isSelected = pathEqual(stepPath, selectedPath);
  return (
    <li>
      <OutlineRow
        icon="fr-icon-layout-grid-line"
        label={step.label}
        count={`${total} bloc${total > 1 ? "s" : ""}`}
        isSelected={isSelected}
        onClick={() => onSelect(stepPath)}
        depth={0}
      />
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {step.blocks.map((block, i) => (
          <OutlineBlock
            key={block.id}
            block={block}
            blockPath={[...stepPath, i]}
            depth={1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </li>
  );
}

interface OutlineBlockProps {
  block: Block;
  blockPath: Path;
  depth: number;
  selectedPath: Path;
  onSelect: (p: Path) => void;
}

function OutlineBlock({
  block,
  blockPath,
  depth,
  selectedPath,
  onSelect,
}: OutlineBlockProps): JSX.Element {
  const def = registry.get(block.type);
  const cfg = (block.config ?? {}) as {
    blocks?: Block[];
    title?: string;
    label?: string;
    content?: string;
  };
  const children = Array.isArray(cfg.blocks) ? cfg.blocks : [];

  const summary = cfg.title ?? cfg.label ?? cfg.content?.slice(0, 40) ?? def?.editorMeta.label ?? block.type;
  const isSelected = pathEqual(blockPath, selectedPath);

  return (
    <li>
      <OutlineRow
        icon={def?.editorMeta.icon ?? "fr-icon-checkbox-blank-circle-line"}
        label={summary}
        sublabel={def?.editorMeta.label ?? block.type}
        isSelected={isSelected}
        onClick={() => onSelect(blockPath)}
        depth={depth}
      />
      {children.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {children.map((c, i) => (
            <OutlineBlock
              key={c.id}
              block={c}
              blockPath={[...blockPath, i]}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

interface OutlineRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  count?: string;
  isSelected: boolean;
  onClick: () => void;
  depth: number;
}

function OutlineRow({
  icon,
  label,
  sublabel,
  count,
  isSelected,
  onClick,
  depth,
}: OutlineRowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      className="fr-text--sm"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        paddingLeft: 8 + depth * 16,
        background: isSelected ? "var(--background-active-blue-france)" : "transparent",
        color: isSelected ? "var(--text-inverted-blue-france)" : "inherit",
        border: "none",
        borderRadius: 4,
        textAlign: "left",
        cursor: "pointer",
        marginBottom: 2,
      }}
    >
      <span className={icon} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
        {sublabel ? (
          <span style={{ opacity: 0.6, marginLeft: 6, fontSize: "0.85em" }}>· {sublabel}</span>
        ) : null}
      </span>
      {count ? (
        <span style={{ opacity: 0.7, fontSize: "0.85em", flexShrink: 0 }}>{count}</span>
      ) : null}
    </button>
  );
}

// ============================================================================
// Détail (droite)
// ============================================================================

interface NodeDetailProps {
  selectedPath: Path;
  steps: Step[];
  onChange: (s: Step[]) => void;
  onSelect: (p: Path) => void;
  onRemove: (p: Path) => void;
  onMove: (p: Path, delta: -1 | 1) => void;
  onAddBlock: (parentPath: Path, type: string) => void;
  data: Data[];
  editable: boolean;
}

function NodeDetail({
  selectedPath,
  steps,
  onChange,
  onSelect,
  onRemove,
  onMove,
  onAddBlock,
  data,
  editable,
}: NodeDetailProps): JSX.Element {
  const breadcrumb = buildBreadcrumb(selectedPath, steps);
  const node = getNodeAt(selectedPath, steps);
  if (!node) return <p>Sélection invalide.</p>;

  const isStep = selectedPath.length === 1;

  return (
    <div
      style={{
        border: "1px solid var(--border-default-grey)",
        borderRadius: 4,
        backgroundColor: "var(--background-default-white)",
      }}
    >
      {/* Breadcrumb sticky */}
      {breadcrumb.length > 1 ? (
        <nav
          aria-label="breadcrumb"
          className="fr-px-2w fr-py-1w"
          style={{
            borderBottom: "1px solid var(--border-default-grey)",
            position: "sticky",
            top: 0,
            background: "var(--background-default-grey)",
            zIndex: 1,
          }}
        >
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 4, fontSize: 14 }}>
            {breadcrumb.map((crumb, i) => (
              <li key={i}>
                {i > 0 ? <span aria-hidden="true" style={{ opacity: 0.5 }}> / </span> : null}
                <button
                  type="button"
                  onClick={() => onSelect(crumb.path)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    textDecoration: i < breadcrumb.length - 1 ? "underline" : "none",
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                    cursor: i < breadcrumb.length - 1 ? "pointer" : "default",
                    color: "inherit",
                  }}
                  disabled={i === breadcrumb.length - 1}
                >
                  {crumb.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="fr-p-3w">
        {isStep ? (
          <StepEditor
            step={node as Step}
            stepIdx={selectedPath[0]!}
            onChange={(updated) => onChange(setStepAt(steps, selectedPath[0]!, () => updated))}
            onSelect={onSelect}
            onAddBlock={(type) => onAddBlock(selectedPath, type)}
            onRemove={() => onRemove(selectedPath)}
            onMove={(delta) => onMove(selectedPath, delta)}
            editable={editable}
            canMoveUp={selectedPath[0]! > 0}
            canMoveDown={selectedPath[0]! < steps.length - 1}
          />
        ) : (
          <BlockEditor
            block={node as Block}
            path={selectedPath}
            steps={steps}
            onUpdateBlock={(fn) => onChange(updateBlockAt(steps, selectedPath, fn))}
            onAddChild={(type) => onAddBlock(selectedPath, type)}
            onSelect={onSelect}
            onRemove={() => onRemove(selectedPath)}
            onMove={(delta) => onMove(selectedPath, delta)}
            data={data}
            editable={editable}
          />
        )}
      </div>
    </div>
  );
}

interface StepEditorProps {
  step: Step;
  stepIdx: number;
  onChange: (s: Step) => void;
  onSelect: (p: Path) => void;
  onAddBlock: (type: string) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function StepEditor({
  step,
  stepIdx,
  onChange,
  onSelect,
  onAddBlock,
  onRemove,
  onMove,
  editable,
  canMoveUp,
  canMoveDown,
}: StepEditorProps): JSX.Element {
  const [showPalette, setShowPalette] = useState(false);
  return (
    <div>
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <h2 className="fr-h4" style={{ margin: 0 }}>
            <span className="fr-icon-layout-grid-line" aria-hidden="true" /> {step.label}
          </h2>
          <p className="fr-text--xs" style={{ opacity: 0.7, margin: 0 }}>
            Étape <code>{step.name}</code> · {step.blocks.length} bloc{step.blocks.length > 1 ? "s" : ""} direct{step.blocks.length > 1 ? "s" : ""}
          </p>
        </div>
        <ActionButtons
          onMoveUp={canMoveUp ? () => onMove(-1) : undefined}
          onMoveDown={canMoveDown ? () => onMove(+1) : undefined}
          onRemove={onRemove}
          removeLabel="Supprimer l'étape"
          editable={editable}
        />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`step-name-${stepIdx}`}>
          Identifiant interne
          <span className="fr-hint-text">Slug technique utilisé dans les règles. Ex. <code>saisie-revenu</code>.</span>
        </label>
        <input
          id={`step-name-${stepIdx}`}
          className="fr-input"
          type="text"
          disabled={!editable}
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
        />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`step-label-${stepIdx}`}>
          Titre visible à l'utilisateur
        </label>
        <input
          id={`step-label-${stepIdx}`}
          className="fr-input"
          type="text"
          disabled={!editable}
          value={step.label}
          onChange={(e) => onChange({ ...step, label: e.target.value })}
        />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`step-desc-${stepIdx}`}>
          Description courte (optionnel)
        </label>
        <textarea
          id={`step-desc-${stepIdx}`}
          className="fr-input"
          rows={2}
          disabled={!editable}
          value={step.description ?? ""}
          onChange={(e) => onChange({ ...step, description: e.target.value || undefined })}
        />
      </div>

      {/* Liste des blocs de cette étape — sélection rapide */}
      <div className="fr-mt-3w fr-pt-2w" style={{ borderTop: "1px solid var(--border-default-grey)" }}>
        <p className="fr-text--sm fr-mb-1w" style={{ fontWeight: 600 }}>
          Blocs de l'étape ({step.blocks.length})
        </p>
        {step.blocks.length === 0 ? (
          <p className="fr-text--xs" style={{ opacity: 0.7 }}>
            Cette étape est vide. Ajoutez un premier bloc ci-dessous.
          </p>
        ) : (
          <ul className="fr-mb-2w" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {step.blocks.map((b, i) => {
              const bDef = registry.get(b.type);
              const bCfg = (b.config ?? {}) as { title?: string; label?: string };
              const lbl = bCfg.title ?? bCfg.label ?? bDef?.editorMeta.label ?? b.type;
              return (
                <li key={b.id} className="fr-mb-1w">
                  <button
                    type="button"
                    onClick={() => onSelect([stepIdx, i])}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      border: "1px solid var(--border-default-grey)",
                      borderRadius: 4,
                      background: "var(--background-default-grey)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className={bDef?.editorMeta.icon ?? "fr-icon-checkbox-blank-circle-line"}
                      aria-hidden="true"
                    />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{lbl}</span>
                    <span className="fr-icon-arrow-right-s-line" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {showPalette ? (
          <BlockPalette
            onPick={(t) => {
              onAddBlock(t);
              setShowPalette(false);
            }}
            onCancel={() => setShowPalette(false)}
          />
        ) : (
          <button
            type="button"
            className="fr-btn fr-btn--sm fr-btn--secondary fr-icon-add-line fr-btn--icon-left"
            disabled={!editable}
            onClick={() => setShowPalette(true)}
          >
            Ajouter un bloc
          </button>
        )}
      </div>
    </div>
  );
}

interface BlockEditorProps {
  block: Block;
  path: Path;
  steps: Step[];
  onUpdateBlock: (fn: (b: Block) => Block) => void;
  onAddChild: (type: string) => void;
  onSelect: (p: Path) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  data: Data[];
  editable: boolean;
}

function BlockEditor({
  block,
  path,
  steps,
  onUpdateBlock,
  onAddChild,
  onSelect,
  onRemove,
  onMove,
  data,
  editable,
}: BlockEditorProps): JSX.Element {
  const def = registry.get(block.type);
  const cfg = (block.config ?? {}) as { blocks?: Block[] };
  const children = Array.isArray(cfg.blocks) ? cfg.blocks : [];
  const isEnvelope = ENVELOPE_TYPES.has(block.type);

  const [showIdInput, setShowIdInput] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // Position dans la liste parente pour calc canMoveUp/Down
  const last = path.length - 1;
  const lastIdx = path[last]!;
  const parentNode = path.length === 2 ? steps[path[0]!]! : getNodeAt(path.slice(0, -1), steps);
  const siblings =
    path.length === 2
      ? (parentNode as Step).blocks
      : ((parentNode as Block).config as { blocks?: Block[] } | undefined)?.blocks ?? [];
  const canMoveUp = lastIdx > 0;
  const canMoveDown = lastIdx < siblings.length - 1;

  return (
    <div>
      {/* Header compact */}
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <h2 className="fr-h5" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span className={def?.editorMeta.icon ?? "fr-icon-checkbox-blank-circle-line"} aria-hidden="true" />
            {def?.editorMeta.label ?? block.type}
          </h2>
          <div className="fr-text--xs" style={{ opacity: 0.7, marginTop: 4 }}>
            {showIdInput ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <input
                  className="fr-input fr-input--sm"
                  style={{ fontFamily: "monospace", padding: "0 4px", height: 24, width: 220 }}
                  type="text"
                  value={block.id}
                  disabled={!editable}
                  onChange={(e) => onUpdateBlock((b) => ({ ...b, id: e.target.value }))}
                  onBlur={() => setShowIdInput(false)}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => editable && setShowIdInput(true)}
                title="Cliquer pour modifier l'identifiant"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: "monospace",
                  cursor: editable ? "text" : "default",
                  color: "inherit",
                  opacity: 0.85,
                }}
              >
                {block.id}
              </button>
            )}
            {def?.editorMeta.description ? (
              <span style={{ marginLeft: 8 }}>· {def.editorMeta.description}</span>
            ) : null}
          </div>
        </div>
        <ActionButtons
          onMoveUp={canMoveUp ? () => onMove(-1) : undefined}
          onMoveDown={canMoveDown ? () => onMove(+1) : undefined}
          onRemove={onRemove}
          removeLabel="Supprimer ce bloc"
          editable={editable}
        />
      </div>

      {/* Config principale */}
      <BlockConfigEditor block={block} onChange={(b) => onUpdateBlock(() => b)} data={data} editable={editable} />

      {/* Sous-blocs (si envelope) */}
      {isEnvelope ? (
        <div className="fr-mt-3w fr-pt-2w" style={{ borderTop: "1px solid var(--border-default-grey)" }}>
          <p className="fr-text--sm fr-mb-1w" style={{ fontWeight: 600 }}>
            Sous-blocs ({children.length})
          </p>
          {children.length === 0 ? (
            <p className="fr-text--xs" style={{ opacity: 0.7 }}>
              Aucun sous-bloc pour le moment. Ajoutez-en avec le bouton ci-dessous.
            </p>
          ) : (
            <ul className="fr-mb-2w" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {children.map((child, i) => {
                const childDef = registry.get(child.type);
                const childCfg = (child.config ?? {}) as { title?: string; label?: string };
                const childLabel =
                  childCfg.title ?? childCfg.label ?? childDef?.editorMeta.label ?? child.type;
                return (
                  <li key={child.id} className="fr-mb-1w">
                    <button
                      type="button"
                      onClick={() => onSelect([...path, i])}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        border: "1px solid var(--border-default-grey)",
                        borderRadius: 4,
                        background: "var(--background-default-grey)",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        className={childDef?.editorMeta.icon ?? "fr-icon-checkbox-blank-circle-line"}
                        aria-hidden="true"
                      />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {childLabel}
                      </span>
                      <span className="fr-icon-arrow-right-s-line" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {showPalette ? (
            <BlockPalette
              onPick={(t) => {
                onAddChild(t);
                setShowPalette(false);
              }}
              onCancel={() => setShowPalette(false)}
            />
          ) : (
            <button
              type="button"
              className="fr-btn fr-btn--sm fr-btn--secondary fr-icon-add-line fr-btn--icon-left"
              disabled={!editable}
              onClick={() => setShowPalette(true)}
            >
              Ajouter un sous-bloc
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// Boutons d'action génériques (↑↓✕ avec icônes DSFR)
// ============================================================================

interface ActionButtonsProps {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  removeLabel: string;
  editable: boolean;
}

function ActionButtons({
  onMoveUp,
  onMoveDown,
  onRemove,
  removeLabel,
  editable,
}: ActionButtonsProps): JSX.Element {
  return (
    <div className="fr-col-auto" style={{ display: "flex", gap: 4 }}>
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-arrow-up-s-line"
        title="Monter"
        aria-label="Monter"
        disabled={!editable || !onMoveUp}
        onClick={onMoveUp}
      />
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-arrow-down-s-line"
        title="Descendre"
        aria-label="Descendre"
        disabled={!editable || !onMoveDown}
        onClick={onMoveDown}
      />
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-bin-line"
        title={removeLabel}
        aria-label={removeLabel}
        disabled={!editable}
        onClick={onRemove}
      />
    </div>
  );
}

// ============================================================================
// Palette de blocs catégorisée (F5.4)
// ============================================================================

interface BlockPaletteProps {
  onPick: (type: string) => void;
  onCancel: () => void;
}

function BlockPalette({ onPick, onCancel }: BlockPaletteProps): JSX.Element {
  const byGroup = useMemo(() => {
    const map = new Map<string, ReturnType<typeof registry.list>>();
    for (const def of registry.list()) {
      const g = def.editorMeta.group ?? "Autres";
      const arr = map.get(g) ?? [];
      arr.push(def);
      map.set(g, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, []);

  return (
    <div
      className="fr-p-2w"
      style={{
        border: "1px solid var(--border-default-blue-france)",
        borderRadius: 4,
        background: "var(--background-default-grey)",
      }}
    >
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <p className="fr-text--sm fr-mb-0" style={{ fontWeight: 600 }}>Quel type de bloc ?</p>
          <p className="fr-text--xs" style={{ opacity: 0.7, margin: 0 }}>
            Cliquez sur une vignette pour l'ajouter.
          </p>
        </div>
        <div className="fr-col-auto">
          <button
            type="button"
            className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-close-line"
            onClick={onCancel}
            aria-label="Annuler"
          />
        </div>
      </div>

      {byGroup.map(([group, defs]) => (
        <div key={group} className="fr-mb-2w">
          <p className="fr-text--xs fr-mb-1w" style={{ opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {group}
          </p>
          <div className="fr-grid-row fr-grid-row--gutters">
            {defs.map((def) => (
              <div key={def.type} className="fr-col-12 fr-col-sm-6 fr-col-md-4">
                <button
                  type="button"
                  onClick={() => onPick(def.type)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    border: "1px solid var(--border-default-grey)",
                    borderRadius: 4,
                    background: "var(--background-default-white)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span className={def.editorMeta.icon} aria-hidden="true" style={{ fontSize: 18 }} />
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: "block", fontSize: 13 }}>{def.editorMeta.label}</strong>
                    {def.editorMeta.description ? (
                      <span style={{ fontSize: 11, opacity: 0.75 }}>
                        {def.editorMeta.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
