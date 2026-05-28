import { useMemo, useState, useCallback, type JSX } from "react";
import type { Simulator as SimulatorDef, Step } from "@g6k4ever/schema";
import {
  evaluate,
  type DataSourceResolver,
  type FunctionRegistry,
  type SimulatorState,
} from "@g6k4ever/engine";
import {
  BlockRegistry,
  createStandardRegistry as createBlocksRegistry,
  type BlockRenderState,
} from "@g6k4ever/blocks";

export interface SimulatorProps {
  /** Définition du simulateur (déjà validée par Zod côté producteur). */
  definition: SimulatorDef;
  /** Résolveur de datasources. Par défaut : un resolver inline-only. */
  resolver?: DataSourceResolver;
  /** Registre des fonctions. Par défaut : createStandardRegistry de @g6k4ever/functions. */
  functions: FunctionRegistry;
  /** Registre des blocs. Par défaut : createStandardRegistry de @g6k4ever/blocks. */
  blocks?: BlockRegistry;
  /** Entrées initiales (par nom de Data). */
  initialInput?: Record<string, unknown>;
  /** Plafond d'itérations à passer au moteur. Défaut : 10. */
  maxIterations?: number;
}

/**
 * Resolver inline-only par défaut (compatible avec les définitions où toutes
 * les sources sont `inline`). Les sources `database`/`api` retournent `null`.
 */
class InlineOnlyResolver implements DataSourceResolver {
  constructor(private readonly simulator: SimulatorDef) {}
  resolve(sourceId: string, parameters: Record<string, unknown>): Record<string, unknown> | null {
    const sourceDef = this.simulator.sources.find((s) => s.id === sourceId);
    if (!sourceDef || sourceDef.kind !== "inline") return null;
    const found = sourceDef.rows.find((row) =>
      Object.entries(parameters).every(
        ([key, value]) => row[key] === value || String(row[key]) === String(value),
      ),
    );
    return found ?? null;
  }
}

/**
 * Composant racine du runtime — rend un simulateur entier.
 *
 * Architecture :
 *   - Maintient l'`input` (saisies user) dans un state local.
 *   - À chaque changement, recompute le `SimulatorState` via `evaluate(...)`.
 *   - Pour chaque step, rend ses blocs visibles via le registre de blocs.
 *
 * Aucun appel réseau ici — le moteur tourne en synchrone côté client. Pour un
 * mode hébergé via API, voir `SimulatorViaApi` (à venir).
 */
export function Simulator(props: SimulatorProps): JSX.Element {
  const {
    definition,
    functions,
    blocks: blocksRegistry,
    initialInput = {},
    maxIterations = 10,
  } = props;
  const [input, setInput] = useState<Record<string, unknown>>(initialInput);

  const blocks = useMemo(() => blocksRegistry ?? createBlocksRegistry(), [blocksRegistry]);
  const resolver = useMemo(
    () => props.resolver ?? new InlineOnlyResolver(definition),
    [props.resolver, definition],
  );

  const state: SimulatorState = useMemo(() => {
    try {
      return evaluate(definition, input, {
        resolvers: { datasources: resolver },
        functions,
        maxIterations,
      });
    } catch (err) {
      // En cas d'erreur engine, retourner un état dégradé visible.
      const message = err instanceof Error ? err.message : String(err);
      return {
        values: new Map(),
        visibility: new Map(),
        notifications: [
          {
            level: "error",
            message: `Erreur du moteur : ${message}`,
            targetType: "step",
            targetId: 0,
          },
        ],
        stable: false,
        iterations: 0,
      };
    }
  }, [definition, input, resolver, functions, maxIterations]);

  const onInput = useCallback((dataName: string, value: unknown) => {
    setInput((prev) => ({ ...prev, [dataName]: value }));
  }, []);

  // Index data par id pour la résolution rapide (utilisée par les blocs).
  const dataByIdOrName = useMemo(() => {
    const m = new Map<string | number, string>();
    for (const d of definition.data) {
      m.set(d.id, d.label);
      m.set(d.name, d.label);
    }
    return m;
  }, [definition.data]);

  const renderState: BlockRenderState = {
    values: state.values,
    visibility: state.visibility,
    onInput,
    getDataLabel: (idOrName) => dataByIdOrName.get(idOrName),
  };

  // Détermine si un objet est visible. La visibilité est posée par les règles
  // avec une clé `<type>:<id>` ; le type dans le `target` d'une action est
  // **sémantique** (section, chapter, blockinfo, footnote) tandis que le bloc
  // lui-même a un type **technique** (text-section, kpi-card, accordion…).
  // On cherche donc toute clé qui se termine par `:<id>`.
  // Par défaut un objet est visible (aucune règle ne s'est prononcée).
  const isVisible = (_type: string, id: string | number): boolean => {
    const suffix = `:${String(id)}`;
    for (const [key, value] of state.visibility) {
      if (key.endsWith(suffix)) return value;
    }
    return true;
  };

  return (
    <div className="g6k-simulator">
      {definition.steps
        .filter((step) => isVisible("step", step.id))
        .map((step) => (
          <StepView
            key={String(step.id)}
            step={step}
            blocks={blocks}
            state={renderState}
            isVisible={isVisible}
          />
        ))}
      <NotificationsView state={state} />
    </div>
  );
}

interface StepViewProps {
  step: Step;
  blocks: BlockRegistry;
  state: BlockRenderState;
  isVisible: (type: string, id: string | number) => boolean;
}

function StepView({ step, blocks, state, isVisible }: StepViewProps): JSX.Element {
  return (
    <section
      className="fr-container fr-py-4w g6k-step"
      data-step-id={step.id}
      aria-label={step.label}
    >
      <h2 className="fr-h3">{step.label}</h2>
      {step.description ? <p className="fr-text--lead">{step.description}</p> : null}
      <BlocksList blocks={step.blocks} registry={blocks} state={state} isVisible={isVisible} />
    </section>
  );
}

interface BlockLike {
  id: string;
  type: string;
  config?: unknown;
}

interface BlocksListProps {
  blocks: BlockLike[];
  registry: BlockRegistry;
  state: BlockRenderState;
  isVisible: (type: string, id: string | number) => boolean;
}

/**
 * Rend une liste ordonnée de blocs.
 *
 * Pour les blocs « envelope » (chapter, blockinfo, accordion) dont la config
 * contient un sous-tableau `blocks`, on descend récursivement et on rend les
 * enfants — c'est une convention de Phase 4/6 stub. Les blocs envelope avec
 * leurs propres React FC arriveront en Phase 4 étendu.
 */
function BlocksList({ blocks, registry, state, isVisible }: BlocksListProps): JSX.Element {
  return (
    <>
      {blocks.map((b) => {
        if (!isVisible(b.type, b.id)) return null;
        const def = registry.get(b.type);
        if (def) {
          const Component = def.render;
          return <Component key={b.id} config={b.config as never} state={state} />;
        }
        // Block non enregistré dans le registre : fallback récursif sur
        // `config.blocks` si présent (envelope simple). Sinon, no-op silencieux.
        const cfg = b.config as { blocks?: BlockLike[] } | undefined;
        if (!cfg) return null;
        if (cfg && Array.isArray(cfg.blocks)) {
          return (
            <div key={b.id} data-block-envelope={b.type}>
              <BlocksList
                blocks={cfg.blocks}
                registry={registry}
                state={state}
                isVisible={isVisible}
              />
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function NotificationsView({ state }: { state: SimulatorState }): JSX.Element | null {
  if (state.notifications.length === 0) return null;
  return (
    <div className="fr-container fr-py-2w" role="alert">
      {state.notifications.map((n, i) => (
        <div
          key={`${n.targetType}-${String(n.targetId)}-${i}`}
          className={
            n.level === "error"
              ? "fr-alert fr-alert--error fr-mb-2w"
              : "fr-alert fr-alert--warning fr-mb-2w"
          }
        >
          <p>{n.message}</p>
        </div>
      ))}
    </div>
  );
}
