import { z } from "zod";
import { SCHEMA_VERSION } from "./version.js";
import { Data } from "./data.js";
import { DataSource } from "./source.js";
import { BusinessRule } from "./rule.js";
import { Step } from "./step.js";
import { Footnote } from "./footnote.js";
import { isUnaryOperator, walkConditionExpr } from "./condition.js";

/**
 * Type de sortie d'un simulateur.
 *
 * - `calcul` : produit des valeurs numériques affichées en KPI/tableau.
 * - `decision` : aiguille vers un texte/résultat parmi N possibles (zonage, oui/non).
 */
export const OutputKind = z.enum(["calcul", "decision"]);
export type OutputKind = z.infer<typeof OutputKind>;

/**
 * Métadonnées d'un simulateur.
 */
export const Metadata = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, "Slug invalide (lettres minuscules, chiffres, tirets)"),
  label: z.string().min(1),
  description: z.string().optional(),
  /** Locale par défaut au format BCP-47, ex: "fr-FR". */
  defaultLocale: z.string().default("fr-FR"),
  /** Format des dates côté UI, ex: "dd/MM/yyyy". */
  dateFormat: z.string().default("dd/MM/yyyy"),
  /** Auteur(s) ou organisation. */
  authors: z.array(z.string()).default([]),
});
export type Metadata = z.infer<typeof Metadata>;

/**
 * Définition complète d'un simulateur — racine du schéma versionné.
 *
 * Toute évolution incompatible incrémente `SCHEMA_VERSION` (cf. version.ts) ;
 * une procédure de migration doit être fournie en parallèle (cf. CLAUDE.md §4 règle 6).
 */
export const Simulator = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    metadata: Metadata,
    outputKind: OutputKind,
    data: z.array(Data).default([]),
    sources: z.array(DataSource).default([]),
    steps: z.array(Step).min(1, "Un simulateur doit avoir au moins une étape."),
    rules: z.array(BusinessRule).default([]),
    footnotes: z.array(Footnote).default([]),
  })
  .superRefine((sim, ctx) => {
    // Unicité des id de Data
    const ids = new Set<number>();
    for (const d of sim.data) {
      if (ids.has(d.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Donnée d'id ${d.id} dupliquée.`,
          path: ["data"],
        });
      }
      ids.add(d.id);
    }
    // Unicité des name de Data
    const names = new Set<string>();
    for (const d of sim.data) {
      if (names.has(d.name)) {
        ctx.addIssue({
          code: "custom",
          message: `Donnée de nom "${d.name}" dupliquée.`,
          path: ["data"],
        });
      }
      names.add(d.name);
    }
    // Unicité des id de Source
    const sourceIds = new Set<string>();
    for (const s of sim.sources) {
      if (sourceIds.has(s.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Source "${s.id}" dupliquée.`,
          path: ["sources"],
        });
      }
      sourceIds.add(s.id);
    }
    // Référence d'une Source par une Data : doit exister
    for (const d of sim.data) {
      if (d.source && !sourceIds.has(d.source.sourceId)) {
        ctx.addIssue({
          code: "custom",
          message: `Donnée "${d.name}" référence la source inconnue "${d.source.sourceId}".`,
          path: ["data"],
        });
      }
    }
    // Unicité des id de Step
    const stepIds = new Set<string | number>();
    for (const st of sim.steps) {
      if (stepIds.has(st.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Étape d'id "${String(st.id)}" dupliquée.`,
          path: ["steps"],
        });
      }
      stepIds.add(st.id);
    }
    // Validation des conditions :
    //   - opérateur unaire (present/blank/isTrue/isFalse) → pas de value
    //   - opérateur binaire → value présent
    //   - operand référence une Data existante
    sim.rules.forEach((rule, ruleIndex) => {
      walkConditionExpr(rule.conditions, (cond) => {
        if (isUnaryOperator(cond.operator) && cond.value !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: `Règle #${ruleIndex} : l'opérateur "${cond.operator}" est unaire et ne prend pas de value.`,
            path: ["rules", ruleIndex, "conditions"],
          });
        }
        if (!isUnaryOperator(cond.operator) && cond.value === undefined) {
          ctx.addIssue({
            code: "custom",
            message: `Règle #${ruleIndex} : l'opérateur "${cond.operator}" exige une value.`,
            path: ["rules", ruleIndex, "conditions"],
          });
        }
        if (!ids.has(cond.operand)) {
          ctx.addIssue({
            code: "custom",
            message: `Règle #${ruleIndex} : la condition référence la donnée inconnue #${cond.operand}.`,
            path: ["rules", ruleIndex, "conditions"],
          });
        }
      });
    });
    // Validation des actions : target.id (data) doit référencer une Data existante
    sim.rules.forEach((rule, ruleIndex) => {
      const allActions = [...rule.ifActions, ...rule.elseActions];
      allActions.forEach((action, actionIndex) => {
        if (action.target.type === "data" && typeof action.target.id === "number") {
          if (!ids.has(action.target.id)) {
            ctx.addIssue({
              code: "custom",
              message: `Règle #${ruleIndex} action #${actionIndex} : référence la donnée inconnue #${action.target.id}.`,
              path: ["rules", ruleIndex],
            });
          }
        }
      });
    });
  });

export type Simulator = z.infer<typeof Simulator>;
