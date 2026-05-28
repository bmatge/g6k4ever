import { useEffect, useMemo, useRef, useState, useCallback, type JSX } from "react";
import type { Simulator as SimulatorDef, Step } from "@g6k4ever/schema";
import type { SimulatorState, Notification } from "@g6k4ever/engine";
import {
  BlockRegistry,
  createStandardRegistry as createBlocksRegistry,
  type BlockRenderState,
} from "@g6k4ever/blocks";

/**
 * Évaluateur asynchrone — typiquement implémenté par un client API qui appelle
 * `POST /run-stateless`. Renvoie un `SimulatorState` désérialisé (Maps prêtes
 * à consommer par les blocs).
 */
export interface ServerEvaluator {
  evaluate(definition: SimulatorDef, input: Record<string, unknown>): Promise<SimulatorState>;
}

/**
 * Utilitaire : transforme la forme JSON renvoyée par l'API (où les Map sont
 * sérialisées en objets) en `SimulatorState` typé (avec vraies `Map`).
 */
export function deserializeSimulatorState(serialized: {
  values: Record<string, unknown>;
  visibility: Record<string, boolean>;
  notifications: Notification[];
  stable: boolean;
  iterations: number;
}): SimulatorState {
  return {
    values: new Map(Object.entries(serialized.values).map(([k, v]) => [Number(k), v])),
    visibility: new Map(Object.entries(serialized.visibility)),
    notifications: serialized.notifications,
    stable: serialized.stable,
    iterations: serialized.iterations,
  };
}

export interface SimulatorViaApiProps {
  definition: SimulatorDef;
  evaluator: ServerEvaluator;
  blocks?: BlockRegistry;
  initialInput?: Record<string, unknown>;
  /** Délai de debounce entre une saisie et l'appel API. Défaut : 300ms. */
  debounceMs?: number;
}

/**
 * Version asynchrone du composant `<Simulator>` qui délègue l'évaluation à un
 * serveur (typiquement l'API g6k4ever). Avantage : bénéficie des providers
 * `database`/`api` du backend que le moteur en navigateur ne peut pas appeler.
 *
 * Comportement :
 *   - À chaque changement d'`input`, debounce puis appelle `evaluator.evaluate`.
 *   - Pendant l'appel, garde le dernier state stable affiché (UX continue).
 *   - Si l'évaluateur renvoie une erreur (ex. simulator invalide), affiche
 *     une notification d'erreur sans casser le DOM.
 */
export function SimulatorViaApi(props: SimulatorViaApiProps): JSX.Element {
  const { definition, evaluator, blocks: blocksRegistry, initialInput = {}, debounceMs = 300 } = props;
  const [input, setInput] = useState<Record<string, unknown>>(initialInput);
  const [state, setState] = useState<SimulatorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const blocks = useMemo(() => blocksRegistry ?? createBlocksRegistry(), [blocksRegistry]);
  const callRef = useRef(0);

  const onInput = useCallback((dataName: string, value: unknown) => {
    setInput((prev) => ({ ...prev, [dataName]: value }));
  }, []);

  // Debounce + appel API
  useEffect(() => {
    const handle = setTimeout(() => {
      const myCall = ++callRef.current;
      setLoading(true);
      evaluator
        .evaluate(definition, input)
        .then((next) => {
          if (myCall !== callRef.current) return; // un appel plus récent a gagné
          setState(next);
          setError(null);
        })
        .catch((err: unknown) => {
          if (myCall !== callRef.current) return;
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          if (myCall === callRef.current) setLoading(false);
        });
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [definition, input, evaluator, debounceMs]);

  const dataByIdOrName = useMemo(() => {
    const m = new Map<string | number, string>();
    for (const d of definition.data) {
      m.set(d.id, d.label);
      m.set(d.name, d.label);
    }
    return m;
  }, [definition.data]);

  const renderState: BlockRenderState = state
    ? {
        values: state.values,
        visibility: state.visibility,
        onInput,
        getDataLabel: (idOrName) => dataByIdOrName.get(idOrName),
      }
    : {
        values: new Map(),
        visibility: new Map(),
        onInput,
        getDataLabel: (idOrName) => dataByIdOrName.get(idOrName),
      };

  const isVisible = (_type: string, id: string | number): boolean => {
    if (!state) return true;
    const suffix = `:${String(id)}`;
    for (const [key, value] of state.visibility) {
      if (key.endsWith(suffix)) return value;
    }
    return true;
  };

  return (
    <div className="g6k-simulator-api" data-loading={loading}>
      {error ? (
        <div className="fr-alert fr-alert--error fr-mb-2w">
          <p className="fr-text--sm">Erreur d'évaluation API : {error}</p>
        </div>
      ) : null}
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
      {loading && !state ? <p className="fr-text--sm">Évaluation initiale…</p> : null}
    </div>
  );
}

// === Sous-composants (clonés de Simulator.tsx avec adaptation API) ===

interface StepViewProps {
  step: Step;
  blocks: BlockRegistry;
  state: BlockRenderState;
  isVisible: (type: string, id: string | number) => boolean;
}

function StepView({ step, blocks, state, isVisible }: StepViewProps): JSX.Element {
  return (
    <section className="fr-container fr-py-4w g6k-step" data-step-id={step.id} aria-label={step.label}>
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

function BlocksList({ blocks, registry, state, isVisible }: BlocksListProps): JSX.Element {
  return (
    <>
      {blocks.map((b) => {
        if (!isVisible(b.type, b.id)) return null;
        const def = registry.get(b.type);
        const cfg = (b.config ?? undefined) as { blocks?: BlockLike[] } | undefined;
        const childBlocks = cfg && Array.isArray(cfg.blocks) ? cfg.blocks : null;

        if (def) {
          const Component = def.render;
          if (childBlocks) {
            return (
              <div key={b.id} data-block={b.type}>
                <Component config={b.config as never} state={state} />
                <BlocksList blocks={childBlocks} registry={registry} state={state} isVisible={isVisible} />
              </div>
            );
          }
          return <Component key={b.id} config={b.config as never} state={state} />;
        }
        if (!cfg) return null;
        if (childBlocks) {
          return (
            <div key={b.id} data-block-envelope={b.type}>
              <BlocksList blocks={childBlocks} registry={registry} state={state} isVisible={isVisible} />
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function NotificationsView({ state }: { state: SimulatorState | null }): JSX.Element | null {
  if (!state || state.notifications.length === 0) return null;
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
