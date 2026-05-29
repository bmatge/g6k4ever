import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `field` — saisie utilisateur liée à une Data.
 *
 * Variant `range` (slider) du type `number` est géré via `widget: "range"`.
 *
 * Le `dataId` doit pointer vers une Data du simulateur. Le rendu se base sur
 * le **type effectif** (passé explicitement ici) pour éviter à ce bloc une
 * dépendance circulaire vers le schéma global.
 */
export const FieldConfig = z.object({
  dataId: z.number().int().positive(),
  dataName: z.string().min(1),
  dataType: z.enum([
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
  ]),
  label: z.string().min(1),
  hint: z.string().optional(),
  prompt: z.string().optional(),
  required: z.boolean().default(false),
  widget: z.string().optional(),
  /** Pour `range` : bornes et pas. */
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  /** Pour `choice` : options. */
  options: z
    .array(
      z.object({
        value: z.union([z.string(), z.number()]),
        label: z.string(),
      }),
    )
    .optional(),
});
export type FieldConfig = z.infer<typeof FieldConfig>;

const FieldRender: ComponentType<BlockRenderProps<FieldConfig>> = ({ config, state }) => {
  const current = state.values.get(config.dataId);
  const onChange = (value: unknown): void => {
    state.onInput?.(config.dataName, value);
  };

  const isRange = config.widget === "range";

  // Sélection de l'input selon le type.
  if (config.dataType === "boolean") {
    return (
      <div className="fr-fieldset__element">
        <div className="fr-toggle">
          <input
            type="checkbox"
            id={`field-${config.dataId}`}
            className="fr-toggle__input"
            checked={current === true || current === "true"}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="fr-toggle__label" htmlFor={`field-${config.dataId}`}>
            {config.label}
          </label>
        </div>
      </div>
    );
  }

  if (config.dataType === "choice" && config.options) {
    return (
      <div className="fr-fieldset__element">
        <div className="fr-select-group">
          <label className="fr-label" htmlFor={`field-${config.dataId}`}>
            {config.label}
            {config.hint ? <span className="fr-hint-text">{config.hint}</span> : null}
          </label>
          <select
            id={`field-${config.dataId}`}
            className="fr-select"
            value={current === undefined ? "" : String(current)}
            onChange={(e) => onChange(e.target.value)}
            required={config.required}
          >
            <option value="">{config.prompt ?? "Choisir une option"}</option>
            {config.options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (isRange) {
    // Structure DSFR : label · fr-range__output (display) · input (sibling).
    // L'input NE DOIT PAS être dans fr-range__output sinon DSFR le remplace.
    return (
      <div className="fr-fieldset__element">
        <div className="fr-range fr-range--sm">
          <label className="fr-label" htmlFor={`field-${config.dataId}`}>
            {config.label}
            {config.hint ? <span className="fr-hint-text">{config.hint}</span> : null}
          </label>
          <div className="fr-range__output">
            {current === undefined ? "—" : String(current)}
          </div>
          <input
            type="range"
            id={`field-${config.dataId}`}
            min={config.min ?? 0}
            max={config.max ?? 100}
            step={config.step ?? 1}
            value={current === undefined ? config.min ?? 0 : Number(current)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      </div>
    );
  }

  // Default : input texte/number
  const isNumeric =
    config.dataType === "integer" ||
    config.dataType === "number" ||
    config.dataType === "money" ||
    config.dataType === "percent" ||
    config.dataType === "year";

  return (
    <div className="fr-fieldset__element">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`field-${config.dataId}`}>
          {config.label}
          {config.hint ? <span className="fr-hint-text">{config.hint}</span> : null}
        </label>
        <input
          type={
            config.dataType === "date" || config.dataType === "month"
              ? config.dataType
              : isNumeric
                ? "number"
                : "text"
          }
          id={`field-${config.dataId}`}
          className="fr-input"
          placeholder={config.prompt}
          required={config.required}
          value={current === undefined ? "" : String(current)}
          onChange={(e) => onChange(isNumeric ? Number(e.target.value) : e.target.value)}
        />
      </div>
    </div>
  );
};

export const fieldBlock: BlockDefinition<FieldConfig> = {
  type: "field",
  configSchema: FieldConfig,
  editorMeta: {
    label: "Champ de saisie",
    icon: "fr-icon-input-line",
    group: "Saisie",
    description: "Champ lié à une Data — texte, nombre, choix, date, slider, etc.",
  },
  readsDataIds: (config) => [config.dataId],
  writesDataIds: (config) => [config.dataId],
  render: FieldRender,
};
