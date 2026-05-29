import { useMemo, type JSX } from "react";
import type { Simulator, ConditionExpr, Action, Block, BusinessRule } from "@g6k4ever/schema";

interface CoherenceCheckerProps {
  simulator: Simulator;
}

interface Issue {
  level: "error" | "warning";
  message: string;
  where: string;
}

/**
 * Vérificateur de cohérence basique du draft courant. Liste les problèmes
 * détectables statiquement (sans évaluer le moteur) :
 *
 *   - Référence à un `#id` inexistant dans une condition ou une action.
 *   - Donnée référencée par un bloc inexistante.
 *   - Étape sans blocs.
 *   - Source référencée par une Data mais non déclarée.
 *   - Action ciblant une Data inexistante.
 *   - Connecteur sans enfants.
 *   - Identifiant de bloc dupliqué dans une même step.
 *
 * S'affiche en haut de l'éditeur en permanence — discret quand tout est vert.
 */
export function CoherenceChecker({ simulator }: CoherenceCheckerProps): JSX.Element {
  const issues = useMemo<Issue[]>(() => collectIssues(simulator), [simulator]);
  if (issues.length === 0) {
    return (
      <div className="fr-alert fr-alert--success fr-alert--sm fr-mb-2w">
        <p className="fr-text--sm">✓ Aucun problème de cohérence détecté.</p>
      </div>
    );
  }
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  return (
    <details
      className={`fr-alert fr-mb-2w ${errors.length > 0 ? "fr-alert--error" : "fr-alert--warning"}`}
      open={errors.length > 0}
    >
      <summary>
        <strong>
          {errors.length} erreur{errors.length > 1 ? "s" : ""} ·{" "}
          {warnings.length} avertissement{warnings.length > 1 ? "s" : ""}
        </strong>
      </summary>
      <ul style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
        {issues.map((iss, idx) => (
          <li key={idx}>
            <strong>{iss.level === "error" ? "✗" : "⚠"}</strong>{" "}
            <code>{iss.where}</code> — {iss.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

function collectIssues(sim: Simulator): Issue[] {
  const issues: Issue[] = [];
  const dataIds = new Set(sim.data.map((d) => d.id));
  const sourceIds = new Set(sim.sources.map((s) => s.id));

  // Data : référence à une source inconnue
  for (const d of sim.data) {
    if (d.source && !sourceIds.has(d.source.sourceId)) {
      issues.push({
        level: "error",
        message: `Source "${d.source.sourceId}" non déclarée`,
        where: `data #${d.id} ${d.name}`,
      });
    }
    if (d.type === "choice" && (!d.options || d.options.length === 0)) {
      issues.push({
        level: "warning",
        message: "Champ de type `choice` sans options définies",
        where: `data #${d.id} ${d.name}`,
      });
    }
    if (d.content) {
      const refs = extractHashIds(d.content);
      for (const r of refs) {
        if (!dataIds.has(r)) {
          issues.push({
            level: "error",
            message: `Expression content référence #${r} inexistant`,
            where: `data #${d.id} ${d.name}.content`,
          });
        }
      }
    }
  }

  // Sources : paramètres bornés à des Data inexistantes
  for (const s of sim.sources) {
    if (s.kind === "database" || s.kind === "api" || s.kind === "inline") {
      for (const p of s.parameters) {
        if (p.bindToDataId !== undefined && !dataIds.has(p.bindToDataId)) {
          issues.push({
            level: "error",
            message: `Paramètre "${p.name}" lié à #${p.bindToDataId} inexistante`,
            where: `source ${s.id}`,
          });
        }
      }
    }
  }

  // Rules : conditions + actions
  for (let i = 0; i < sim.rules.length; i++) {
    const rule = sim.rules[i]!;
    const ruleWhere = `rule ${rule.id ?? rule.name ?? `#${i + 1}`}`;
    walkConditions(rule.conditions, dataIds, ruleWhere, issues);
    for (const action of [...rule.ifActions, ...rule.elseActions]) {
      checkAction(action, dataIds, ruleWhere, issues);
    }
  }

  // Steps : blocs vides + ids dupliqués
  const blockIdsSeen = new Map<string, string>();
  for (const step of sim.steps) {
    if (step.blocks.length === 0) {
      issues.push({
        level: "warning",
        message: "Étape sans blocs",
        where: `step ${step.name}`,
      });
    }
    walkBlocks(step.blocks, `step ${step.name}`, dataIds, blockIdsSeen, issues);
  }

  return issues;
}

function extractHashIds(expr: string): number[] {
  const ids: number[] = [];
  for (const m of expr.matchAll(/#(\d+)/g)) {
    const idMatch = m[1];
    if (idMatch !== undefined) ids.push(Number(idMatch));
  }
  return ids;
}

function walkConditions(expr: ConditionExpr, dataIds: Set<number>, where: string, issues: Issue[]): void {
  if (expr.kind === "condition") {
    if (!dataIds.has(expr.operand)) {
      issues.push({
        level: "error",
        message: `Condition sur opérande #${expr.operand} inexistante`,
        where,
      });
    }
    if (expr.value) {
      for (const r of extractHashIds(expr.value)) {
        if (!dataIds.has(r)) {
          issues.push({
            level: "error",
            message: `Valeur de condition référence #${r} inexistante`,
            where,
          });
        }
      }
    }
    return;
  }
  if (expr.children.length === 0) {
    issues.push({
      level: "warning",
      message: `Connecteur ${expr.type} sans enfants`,
      where,
    });
  }
  for (const child of expr.children) {
    walkConditions(child, dataIds, where, issues);
  }
}

function checkAction(action: Action, dataIds: Set<number>, where: string, issues: Issue[]): void {
  if (action.kind === "setAttribute" || action.kind === "unsetAttribute") {
    if (!dataIds.has(action.target.id)) {
      issues.push({
        level: "error",
        message: `Action ${action.kind} cible #${action.target.id} inexistante`,
        where,
      });
    }
  }
  if (action.kind === "setAttribute") {
    for (const r of extractHashIds(action.value)) {
      if (!dataIds.has(r)) {
        issues.push({
          level: "error",
          message: `Expression de setAttribute référence #${r} inexistante`,
          where,
        });
      }
    }
  }
  if (action.kind === "notifyError" || action.kind === "notifyWarning") {
    for (const r of extractHashIds(action.message)) {
      if (!dataIds.has(r)) {
        issues.push({
          level: "warning",
          message: `Message de notification référence #${r} inexistante`,
          where,
        });
      }
    }
  }
}

function walkBlocks(
  blocks: Block[],
  where: string,
  dataIds: Set<number>,
  seen: Map<string, string>,
  issues: Issue[],
): void {
  for (const b of blocks) {
    const prev = seen.get(b.id);
    if (prev) {
      issues.push({
        level: "error",
        message: `Identifiant de bloc "${b.id}" dupliqué (déjà utilisé dans ${prev})`,
        where: `${where} bloc ${b.id}`,
      });
    } else {
      seen.set(b.id, where);
    }

    // Champ : check dataId
    if (b.type === "field") {
      const cfg = (b.config ?? {}) as { dataId?: number };
      if (cfg.dataId !== undefined && !dataIds.has(cfg.dataId)) {
        issues.push({
          level: "error",
          message: `Champ référence la donnée #${cfg.dataId} inexistante`,
          where: `${where} bloc ${b.id}`,
        });
      }
    }
    // kpi-card / text-section : interpolations dans le contenu
    if (b.type === "kpi-card") {
      const cfg = (b.config ?? {}) as { dataId?: number };
      if (cfg.dataId !== undefined && !dataIds.has(cfg.dataId)) {
        issues.push({
          level: "error",
          message: `KPI référence la donnée #${cfg.dataId} inexistante`,
          where: `${where} bloc ${b.id}`,
        });
      }
    }
    if (b.type === "text-section") {
      const cfg = (b.config ?? {}) as { content?: string };
      if (cfg.content) {
        for (const r of extractHashIds(cfg.content)) {
          if (!dataIds.has(r)) {
            issues.push({
              level: "warning",
              message: `Texte référence #${r} inexistante (interpolation vide)`,
              where: `${where} bloc ${b.id}`,
            });
          }
        }
      }
    }
    // Récursion envelope
    const cfg = (b.config ?? {}) as { blocks?: Block[] };
    if (Array.isArray(cfg.blocks)) {
      walkBlocks(cfg.blocks, `${where} > ${b.id}`, dataIds, seen, issues);
    }
  }
}

// Forward declarations pour shut le linter sur les imports non utilisés
export type { BusinessRule };
