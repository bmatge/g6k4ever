import type { JSX } from "react";
import type { BusinessRule, Data, Simulator } from "@g6k4ever/schema";
import { ConditionTree } from "./ConditionTree.js";
import { ActionListEditor } from "./ActionEditor.js";

interface RulesEditorProps {
  rules: Simulator["rules"];
  onChange: (next: Simulator["rules"]) => void;
  data: Data[];
  editable: boolean;
}

const blankRule = (id: string, firstDataId: number): BusinessRule => ({
  id,
  name: id,
  conditions: { kind: "condition", operand: firstDataId, operator: "present" },
  ifActions: [],
  elseActions: [],
});

export function RulesEditor({ rules, onChange, data, editable }: RulesEditorProps): JSX.Element {
  const firstDataId = data[0]?.id ?? 1;

  const add = (): void => {
    const id = `R${rules.length + 1}`;
    onChange([...rules, blankRule(id, firstDataId)]);
  };
  const remove = (i: number): void => {
    onChange(rules.filter((_, idx) => idx !== i));
  };
  const update = (i: number, next: BusinessRule): void => {
    const list = [...rules];
    list[i] = next;
    onChange(list);
  };

  return (
    <div>
      {rules.length === 0 ? (
        <p className="fr-text--sm" style={{ opacity: 0.75 }}>
          Aucune règle. Cliquez sur « + Nouvelle règle » pour démarrer.
        </p>
      ) : null}
      {rules.map((rule, i) => (
        <details key={i} className="fr-mb-3w" open={i === 0}>
          <summary className="fr-text--lg" style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{rule.name ?? rule.id ?? `Règle #${i + 1}`}</strong>
          </summary>
          <div className="fr-pl-2w fr-pt-1w">
            <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`rule-name-${i}`}>
                    Nom de la règle
                  </label>
                  <input
                    id={`rule-name-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={rule.name ?? ""}
                    onChange={(e) => update(i, { ...rule, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-4">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`rule-id-${i}`}>
                    Identifiant
                  </label>
                  <input
                    id={`rule-id-${i}`}
                    className="fr-input"
                    type="text"
                    disabled={!editable}
                    value={String(rule.id ?? "")}
                    onChange={(e) => update(i, { ...rule, id: e.target.value })}
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
                  Supprimer la règle
                </button>
              </div>
            </div>

            <p className="fr-text--sm fr-mt-2w" style={{ opacity: 0.75 }}>
              <strong>Conditions :</strong>
            </p>
            <ConditionTree
              value={rule.conditions}
              onChange={(conditions) => update(i, { ...rule, conditions })}
              data={data}
            />

            <ActionListEditor
              label="Si vrai"
              actions={rule.ifActions}
              onChange={(ifActions) => update(i, { ...rule, ifActions })}
              data={data}
              editable={editable}
            />
            <ActionListEditor
              label="Sinon"
              actions={rule.elseActions}
              onChange={(elseActions) => update(i, { ...rule, elseActions })}
              data={data}
              editable={editable}
            />
          </div>
        </details>
      ))}
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-btn--secondary fr-mt-2w"
        disabled={!editable}
        onClick={add}
      >
        + Nouvelle règle
      </button>
    </div>
  );
}
