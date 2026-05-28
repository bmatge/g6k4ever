import type { JSX } from "react";
import type { ConditionExpr, ConditionOperator, Data, ConnectorType } from "@g6k4ever/schema";
import { UNARY_OPERATORS } from "@g6k4ever/schema";

interface ConditionTreeProps {
  value: ConditionExpr;
  onChange: (next: ConditionExpr) => void;
  data: Data[];
  depth?: number;
}

/**
 * Éditeur visuel structuré d'une `ConditionExpr` (le mode **guidé** des règles).
 *
 * Récursif : un connector imbrique d'autres connectors ou des conditions
 * élémentaires. L'utilisateur peut ajouter/supprimer, changer l'opérande,
 * l'opérateur et la valeur via des selects DSFR.
 *
 * Phase 7a : pas de mode expert (codemirror) pour l'instant. Le JSON brut
 * reste accessible via le `JsonEditor` global.
 */
export function ConditionTree(props: ConditionTreeProps): JSX.Element {
  const { value, onChange, data, depth = 0 } = props;

  if (value.kind === "condition") {
    const isUnary = (UNARY_OPERATORS as readonly string[]).includes(value.operator);
    return (
      <div
        className="fr-grid-row fr-grid-row--gutters fr-mb-1w"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="fr-col">
          <select
            className="fr-select"
            value={value.operand}
            onChange={(e) =>
              onChange({ ...value, operand: Number(e.target.value) })
            }
          >
            {data.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id} — {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="fr-col">
          <select
            className="fr-select"
            value={value.operator}
            onChange={(e) => {
              const operator = e.target.value as ConditionOperator;
              const nextIsUnary = (UNARY_OPERATORS as readonly string[]).includes(operator);
              onChange({
                kind: "condition",
                operand: value.operand,
                operator,
                ...(nextIsUnary ? {} : { value: value.value ?? "" }),
              });
            }}
          >
            <option value="present">est défini</option>
            <option value="blank">est vide</option>
            <option value="isTrue">est vrai</option>
            <option value="isFalse">est faux</option>
            <option value="=">=</option>
            <option value="!=">≠</option>
            <option value="<">&lt;</option>
            <option value="<=">≤</option>
            <option value=">">&gt;</option>
            <option value=">=">≥</option>
          </select>
        </div>
        {!isUnary ? (
          <div className="fr-col">
            <input
              className="fr-input"
              type="text"
              placeholder="valeur (expression)"
              value={value.value ?? ""}
              onChange={(e) => onChange({ ...value, value: e.target.value })}
            />
          </div>
        ) : null}
      </div>
    );
  }

  // Connector récursif.
  const handleChildChange = (i: number, child: ConditionExpr): void => {
    const children = [...value.children];
    children[i] = child;
    onChange({ ...value, children });
  };
  const handleAddCondition = (): void => {
    const firstData = data[0];
    if (!firstData) return;
    onChange({
      ...value,
      children: [
        ...value.children,
        { kind: "condition", operand: firstData.id, operator: "present" },
      ],
    });
  };
  const handleAddConnector = (): void => {
    const firstData = data[0];
    if (!firstData) return;
    onChange({
      ...value,
      children: [
        ...value.children,
        {
          kind: "connector",
          type: "all",
          children: [{ kind: "condition", operand: firstData.id, operator: "present" }],
        },
      ],
    });
  };
  const handleRemove = (i: number): void => {
    if (value.children.length <= 1) return;
    onChange({ ...value, children: value.children.filter((_, idx) => idx !== i) });
  };

  return (
    <div
      style={{
        marginLeft: depth * 16,
        borderLeft: "2px solid var(--border-default-blue-france)",
        paddingLeft: 12,
      }}
      className="fr-mb-2w"
    >
      <div className="fr-mb-1w">
        <select
          className="fr-select"
          style={{ display: "inline-block", width: "auto" }}
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as ConnectorType })
          }
        >
          <option value="all">Tout (ET)</option>
          <option value="any">Au moins un (OU)</option>
          <option value="none">Aucun (NON)</option>
        </select>
      </div>
      {value.children.map((child, i) => (
        <div key={i} className="fr-grid-row fr-grid-row--gutters fr-mb-1w fr-grid-row--middle">
          <div className="fr-col">
            <ConditionTree
              value={child}
              onChange={(c) => handleChildChange(i, c)}
              data={data}
              depth={depth + 1}
            />
          </div>
          <div className="fr-col-1">
            <button
              type="button"
              className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
              onClick={() => handleRemove(i)}
              disabled={value.children.length <= 1}
              aria-label="Supprimer cette condition"
              title="Supprimer"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <div className="fr-mt-1w">
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--secondary fr-mr-1w"
          onClick={handleAddCondition}
        >
          + Condition
        </button>
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--secondary"
          onClick={handleAddConnector}
        >
          + Groupe
        </button>
      </div>
    </div>
  );
}
