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

  const isStepper = definition.metadata.navigation === "stepper";
  // En mode free : on cache les steps invisibles avant rendu (ordre actuel).
  // En mode stepper : on garde toutes les steps pour le compteur "N sur Total",
  // et on délègue la navigation à StepperView qui sait sauter les invisibles.
  const visibleSteps = useMemo(
    () => definition.steps.filter((step) => isVisible("step", step.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isVisible reads state.visibility
    [definition.steps, state.visibility],
  );

  return (
    <div className="g6k-simulator">
      {isStepper ? (
        <StepperView
          steps={definition.steps}
          blocks={blocks}
          state={renderState}
          values={state.values}
          isVisible={isVisible}
          allBlocks={blocks}
        />
      ) : (
        visibleSteps.map((step) => (
          <StepView
            key={String(step.id)}
            step={step}
            blocks={blocks}
            state={renderState}
            isVisible={isVisible}
          />
        ))
      )}
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

interface StepperViewProps {
  steps: Step[];
  blocks: BlockRegistry;
  state: BlockRenderState;
  values: Map<number, unknown>;
  isVisible: (type: string, id: string | number) => boolean;
  allBlocks: BlockRegistry;
}

/**
 * Mode wizard : une seule étape rendue à la fois, navigation avec
 * `fr-stepper` DSFR + boutons Précédent / Suivant. Activé par
 * `metadata.navigation: "stepper"`.
 *
 * Visibilité dynamique : quand une règle masque/affiche une étape, la liste
 * `steps` reçue est déjà filtrée. Si l'utilisateur était sur une étape qui
 * vient de disparaître, on reclamp `currentIndex` au max disponible.
 *
 * Validation "Suivant" : on collecte récursivement tous les blocs `field`
 * visibles de l'étape courante avec `config.required: true`, et on vérifie
 * que la Data associée a une valeur définie (non `undefined`, non chaîne
 * vide). Sinon le bouton est désactivé avec un message d'aide.
 */
function StepperView({
  steps,
  blocks,
  state,
  values,
  isVisible,
}: StepperViewProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reclamp si l'étape courante dépasse le total (cas extrême).
  const safeIndex = Math.min(currentIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeIndex];

  if (!currentStep) {
    return (
      <div className="fr-container fr-py-4w">
        <p>Aucune étape à afficher pour le moment.</p>
      </div>
    );
  }

  const total = steps.length;
  // Compteur stable : numérateur = index courant + 1, dénominateur = total
  // des étapes du simulateur. En mode stepper la visibilité step (rules
  // `hide step`) est ignorée pour la navigation : c'est la validation
  // `required` qui empêche de sauter une étape sans données.
  const counterPosition = safeIndex + 1;
  const counterTotal = total;

  const nextIdx = safeIndex < total - 1 ? safeIndex + 1 : -1;
  const prevIdx = safeIndex > 0 ? safeIndex - 1 : -1;
  const isLast = nextIdx === -1;
  const isFirst = prevIdx === -1;

  // Collecte récursive des dataIds requis (visibles) de l'étape courante.
  const requiredDataIds = collectRequiredDataIds(currentStep.blocks, isVisible);
  const missingRequired = requiredDataIds.filter((id) => {
    const v = values.get(id);
    return v === undefined || v === null || v === "";
  });
  const canAdvance = missingRequired.length === 0;

  return (
    <div className="fr-container fr-py-2w g6k-stepper">
      {/* Stepper DSFR — montre la position dans les étapes visibles */}
      <div className="fr-stepper">
        <h2 className="fr-stepper__title">
          {currentStep.label}
          <span className="fr-stepper__state">
            Étape {counterPosition} sur {counterTotal}
          </span>
        </h2>
        <div
          className="fr-stepper__steps"
          data-fr-current-step={counterPosition}
          data-fr-steps={counterTotal}
        />
        {!isLast && nextIdx >= 0 ? (
          <p className="fr-stepper__details">
            <span className="fr-text--bold">Étape suivante :</span> {steps[nextIdx]!.label}
          </p>
        ) : null}
      </div>

      {currentStep.description ? (
        <p className="fr-text--lead">{currentStep.description}</p>
      ) : null}

      <BlocksList blocks={currentStep.blocks} registry={blocks} state={state} isVisible={isVisible} />

      {!canAdvance ? (
        <p className="fr-text--sm" style={{ opacity: 0.75, marginTop: "1rem" }}>
          Renseignez les champs obligatoires pour passer à l'étape suivante.
        </p>
      ) : null}

      <ul className="fr-btns-group fr-btns-group--inline-md fr-mt-3w">
        <li>
          <button
            type="button"
            className="fr-btn fr-btn--secondary"
            disabled={isFirst}
            onClick={() => prevIdx >= 0 && setCurrentIndex(prevIdx)}
          >
            Précédent
          </button>
        </li>
        <li>
          {isLast ? (
            <button
              type="button"
              className="fr-btn fr-btn--tertiary"
              onClick={() => {
                // Aller à la première step visible
                for (let i = 0; i < total; i++) {
                  if (isVisible("step", steps[i]!.id)) {
                    setCurrentIndex(i);
                    return;
                  }
                }
                setCurrentIndex(0);
              }}
            >
              Recommencer
            </button>
          ) : (
            <button
              type="button"
              className="fr-btn"
              disabled={!canAdvance}
              onClick={() => nextIdx >= 0 && setCurrentIndex(nextIdx)}
            >
              Suivant
            </button>
          )}
        </li>
      </ul>
    </div>
  );
}

/**
 * Descente récursive dans les blocs visibles d'une étape pour collecter les
 * `dataId` des fields `required: true`. Les chapters/envelopes masqués sont
 * ignorés. Utilisé par le stepper pour décider si "Suivant" est cliquable.
 */
function collectRequiredDataIds(
  blocks: ReadonlyArray<BlockLike>,
  isVisible: (type: string, id: string | number) => boolean,
): number[] {
  const ids: number[] = [];
  const visit = (list: ReadonlyArray<BlockLike>): void => {
    for (const b of list) {
      if (!isVisible(b.type, b.id)) continue;
      const cfg = (b.config ?? {}) as { dataId?: number; required?: boolean; blocks?: BlockLike[] };
      if (b.type === "field" && cfg.required === true && typeof cfg.dataId === "number") {
        ids.push(cfg.dataId);
      }
      if (Array.isArray(cfg.blocks)) visit(cfg.blocks);
    }
  };
  visit(blocks);
  return ids;
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
        const cfg = (b.config ?? undefined) as { blocks?: BlockLike[] } | undefined;
        const childBlocks = cfg && Array.isArray(cfg.blocks) ? cfg.blocks : null;

        if (def) {
          const Component = def.render;
          // Si le bloc a une `config.blocks` (envelope chapter/blockinfo/...),
          // on rend son chrome PUIS les enfants en dessous, à la même profondeur.
          if (childBlocks) {
            return (
              <div key={b.id} data-block={b.type}>
                <Component config={b.config as never} state={state} />
                <BlocksList
                  blocks={childBlocks}
                  registry={registry}
                  state={state}
                  isVisible={isVisible}
                />
              </div>
            );
          }
          return <Component key={b.id} config={b.config as never} state={state} />;
        }
        // Type non enregistré : fallback récursif sur `config.blocks`.
        if (!cfg) return null;
        if (childBlocks) {
          return (
            <div key={b.id} data-block-envelope={b.type}>
              <BlocksList
                blocks={childBlocks}
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
