import type { JSX } from "react";
import type { Action, Data, ObjectTargetType } from "@g6k4ever/schema";
import { ExpressionEditor } from "./ExpressionEditor.js";

interface ActionListEditorProps {
  /** Étiquette de la liste (ex. « Actions si vrai » / « Sinon »). */
  label: string;
  actions: Action[];
  onChange: (next: Action[]) => void;
  data: Data[];
  editable: boolean;
}

const OBJECT_TARGET_TYPES: ObjectTargetType[] = [
  "step",
  "panel",
  "fieldset",
  "field",
  "section",
  "chapter",
  "footnote",
  "blockinfo",
  "prenote",
  "postnote",
  "action",
  "data",
];

/** Libellés français des types de cibles (audit UX, § Wording — francisation). */
const OBJECT_TARGET_LABELS: Record<ObjectTargetType, string> = {
  step: "Étape",
  panel: "Panneau",
  fieldset: "Groupe de champs",
  field: "Champ",
  section: "Section",
  chapter: "Chapitre",
  footnote: "Note de bas de page",
  blockinfo: "Bloc info",
  prenote: "Note avant champ",
  postnote: "Note après champ",
  action: "Action",
  data: "Donnée",
};

const DEFAULT_ACTION: Action = {
  kind: "showObject",
  target: { type: "blockinfo", id: "result" },
};

/**
 * Éditeur d'une liste d'actions (`ifActions` ou `elseActions` d'une règle).
 *
 * Pour chaque action : sélecteur de type d'action, formulaire spécifique
 * selon le `kind` (showObject/hideObject = target type+id, setAttribute =
 * data+expression, unsetAttribute = data, notify = level+message+target).
 */
export function ActionListEditor(props: ActionListEditorProps): JSX.Element {
  const { label, actions, onChange, data, editable } = props;

  const update = (i: number, next: Action): void => {
    const list = [...actions];
    list[i] = next;
    onChange(list);
  };
  const remove = (i: number): void => {
    onChange(actions.filter((_, idx) => idx !== i));
  };
  const add = (): void => {
    onChange([...actions, DEFAULT_ACTION]);
  };

  return (
    <div className="fr-mb-2w">
      <p className="fr-text--sm fr-mb-1w" style={{ opacity: 0.75 }}>
        <strong>{label}</strong> ({actions.length})
      </p>
      {actions.map((action, i) => (
        <div key={i} className="fr-mb-1w" style={{ borderLeft: "3px solid var(--background-action-high-blue-france)", paddingLeft: 10 }}>
          <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle">
            <div className="fr-col">
              <ActionRow action={action} onChange={(a) => update(i, a)} data={data} editable={editable} />
            </div>
            <div className="fr-col-1">
              <button
                type="button"
                className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                disabled={!editable}
                onClick={() => remove(i)}
                aria-label="Supprimer cette action"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--secondary"
        disabled={!editable}
        onClick={add}
      >
        + Action
      </button>
    </div>
  );
}

interface ActionRowProps {
  action: Action;
  onChange: (next: Action) => void;
  data: Data[];
  editable: boolean;
}

function ActionRow({ action, onChange, data, editable }: ActionRowProps): JSX.Element {
  const changeKind = (kind: string): void => {
    // Migrer vers un default cohérent selon le kind cible.
    if (kind === "showObject" || kind === "hideObject") {
      onChange({ kind, target: { type: "blockinfo", id: "result" } });
      return;
    }
    if (kind === "setAttribute") {
      onChange({
        kind: "setAttribute",
        target: { type: "data", id: data[0]?.id ?? 1, attribute: "content" },
        value: "",
      });
      return;
    }
    if (kind === "unsetAttribute") {
      onChange({
        kind: "unsetAttribute",
        target: { type: "data", id: data[0]?.id ?? 1, attribute: "content" },
      });
      return;
    }
    if (kind === "notifyError" || kind === "notifyWarning") {
      onChange({
        kind,
        target: { type: "data", id: data[0]?.id ?? 1 },
        message: "Message à afficher",
      });
      return;
    }
  };

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col-12 fr-col-md-3">
        <select
          className="fr-select"
          disabled={!editable}
          value={action.kind}
          onChange={(e) => changeKind(e.target.value)}
        >
          <option value="showObject">Montrer</option>
          <option value="hideObject">Masquer</option>
          <option value="setAttribute">Calculer la valeur de…</option>
          <option value="unsetAttribute">Réinitialiser</option>
          <option value="notifyError">Bloquer avec un message</option>
          <option value="notifyWarning">Afficher un avertissement</option>
        </select>
      </div>

      {(action.kind === "showObject" || action.kind === "hideObject") ? (
        <>
          <div className="fr-col-12 fr-col-md-4">
            <select
              className="fr-select"
              disabled={!editable}
              value={action.target.type}
              onChange={(e) =>
                onChange({ ...action, target: { ...action.target, type: e.target.value as ObjectTargetType } })
              }
            >
              {OBJECT_TARGET_TYPES.map((t) => (
                <option key={t} value={t}>{OBJECT_TARGET_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="fr-col-12 fr-col-md-5">
            <input
              className="fr-input"
              type="text"
              placeholder="id de l'objet ciblé"
              disabled={!editable}
              value={String(action.target.id)}
              onChange={(e) => onChange({ ...action, target: { ...action.target, id: e.target.value } })}
            />
          </div>
        </>
      ) : null}

      {action.kind === "setAttribute" ? (
        <>
          <div className="fr-col-12 fr-col-md-4">
            <select
              className="fr-select"
              disabled={!editable}
              value={action.target.id}
              onChange={(e) => onChange({ ...action, target: { ...action.target, id: Number(e.target.value) } })}
            >
              {data.map((d) => (
                <option key={d.id} value={d.id}>#{d.id} {d.name}</option>
              ))}
            </select>
          </div>
          <div className="fr-col-12 fr-col-md-5">
            <ExpressionEditor
              value={action.value}
              onChange={(v) => onChange({ ...action, value: v })}
              data={data}
              editable={editable}
              placeholder="expression (ex. getInsee(#1))"
            />
          </div>
        </>
      ) : null}

      {action.kind === "unsetAttribute" ? (
        <div className="fr-col-12 fr-col-md-9">
          <select
            className="fr-select"
            disabled={!editable}
            value={action.target.id}
            onChange={(e) => onChange({ ...action, target: { ...action.target, id: Number(e.target.value) } })}
          >
            {data.map((d) => (
              <option key={d.id} value={d.id}>#{d.id} {d.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {(action.kind === "notifyError" || action.kind === "notifyWarning") ? (
        <>
          <div className="fr-col-12 fr-col-md-4">
            <select
              className="fr-select"
              disabled={!editable}
              value={String(action.target.id)}
              onChange={(e) => {
                const v = e.target.value;
                const asNum = Number(v);
                const id = Number.isInteger(asNum) && !Number.isNaN(asNum) ? asNum : v;
                onChange({ ...action, target: { ...action.target, id } });
              }}
            >
              {data.map((d) => (
                <option key={d.id} value={d.id}>#{d.id} {d.name}</option>
              ))}
            </select>
          </div>
          <div className="fr-col-12 fr-col-md-5">
            <input
              className="fr-input"
              type="text"
              placeholder="Message (interpolation #var autorisée)"
              disabled={!editable}
              value={action.message}
              onChange={(e) => onChange({ ...action, message: e.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
