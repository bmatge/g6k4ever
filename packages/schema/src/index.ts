/**
 * @g6k4ever/schema — schéma Zod versionné d'une définition de simulateur.
 *
 * Source de vérité unique du projet (cf. CLAUDE.md §4). Toute évolution incompatible
 * incrémente `SCHEMA_VERSION` et prévoit sa migration.
 *
 * Composer une définition revient à fournir un objet typé `Simulator` validable par
 * `Simulator.safeParse(json)`.
 */

export { SCHEMA_VERSION, type SchemaVersion } from "./version.js";
export { Expression } from "./expression.js";
export { Data, DataType, ChoiceOption } from "./data.js";
export {
  DataSource,
  InlineDataSource,
  DatabaseDataSource,
  ApiDataSource,
  ColumnSpec,
  ParameterSpec,
} from "./source.js";
export {
  ConditionExpr,
  ConditionOperator,
  Condition,
  ConnectorType,
  UNARY_OPERATORS,
} from "./condition.js";
export {
  Action,
  ObjectTarget,
  ObjectTargetType,
  ShowHideAction,
  SetAttributeAction,
  UnsetAttributeAction,
  NotifyAction,
} from "./action.js";
export { BusinessRule } from "./rule.js";
export { Block } from "./block.js";
export { Step } from "./step.js";
export { Footnote } from "./footnote.js";
export { Simulator, Metadata, OutputKind } from "./simulator.js";
export { toJsonSchema } from "./json-schema.js";
