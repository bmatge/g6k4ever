import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { Simulator } from "@g6k4ever/schema";
import { Simulator as RuntimeSimulator } from "@g6k4ever/runtime";
import { createStandardRegistry } from "@g6k4ever/functions";
import { ApiError, type ApiClient } from "../api-client.js";
import { JsonEditor } from "../widgets/JsonEditor.js";
import { MetadataForm } from "../widgets/MetadataForm.js";
import { DataEditor } from "../widgets/DataEditor.js";
import { SourcesEditor } from "../widgets/SourcesEditor.js";
import { RulesEditor } from "../widgets/RulesEditor.js";
import { StepsEditor } from "../widgets/StepsEditor.js";
import { CoherenceChecker } from "../widgets/CoherenceChecker.js";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

interface SimulatorEditorProps {
  api: ApiClient;
  slug: string;
  onClose: () => void;
}

type Section = "metadata" | "data" | "sources" | "steps" | "rules" | "json" | "test";

const SECTION_LABELS: Record<Section, string> = {
  metadata: "Métadonnées",
  data: "Données",
  sources: "Sources",
  steps: "Étapes & blocs",
  rules: "Règles",
  json: "JSON brut",
  test: "Tester",
};

const SECTION_ORDER: Section[] = [
  "metadata",
  "data",
  "sources",
  "steps",
  "rules",
  "json",
  "test",
];

export function SimulatorEditor({ api, slug, onClose }: SimulatorEditorProps): JSX.Element {
  const [draft, setDraft] = useState<Simulator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<"idle" | "acquired" | "held-by-other" | "not-found">("idle");
  const [lockHeldBy, setLockHeldBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("metadata");

  // Moteur fonctions partagé pour la preview (sync, instant).
  const functions = useRef(createStandardRegistry()).current;
  // Détecte si le simulateur a des sources non-inline qui ne pourront pas
  // s'évaluer en local (warning dans le pane preview).
  const hasNonInlineSources = useMemo(
    () => (draft?.sources ?? []).some((s) => s.kind !== "inline"),
    [draft],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(slug);
        if (cancelled) return;
        setDraft(data.simulator.draftDefinition);
        const lockRes = await api.acquireLock(slug);
        if (cancelled) return;
        if (lockRes.status === "acquired") setLockStatus("acquired");
        else if (lockRes.status === "held-by-other") {
          setLockStatus("held-by-other");
          setLockHeldBy(lockRes.heldBy ?? "?");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setLockStatus("not-found");
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
      void api.releaseLock(slug).catch(() => undefined);
    };
  }, [api, slug]);

  useEffect(() => {
    if (lockStatus !== "acquired") return;
    const id = setInterval(() => {
      void api.heartbeatLock(slug).catch(() => undefined);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [api, slug, lockStatus]);

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.update(slug, draft);
      setDraft(res.simulator.draftDefinition);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!draft) return;
    setSaving(true);
    try {
      await api.update(slug, draft);
      await api.publish(slug);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = (): void => {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.metadata.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleForceTakeOver = async (): Promise<void> => {
    setError(null);
    try {
      const res = await api.acquireLock(slug, true);
      if (res.status === "acquired") {
        setLockStatus("acquired");
        setLockHeldBy(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!draft && lockStatus === "not-found") {
    return (
      <div className="fr-container fr-py-4w">
        <div className="fr-alert fr-alert--error">
          <p>Simulateur introuvable : <code>{slug}</code></p>
          <button type="button" className="fr-btn fr-btn--sm fr-mt-2w" onClick={onClose}>Retour</button>
        </div>
      </div>
    );
  }

  if (!draft) {
    return <div className="fr-container fr-py-4w"><p>Chargement…</p></div>;
  }

  const editable = lockStatus === "acquired";

  return (
    <div className="fr-container--fluid fr-py-2w">
      {/* Header */}
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <button type="button" className="fr-btn fr-btn--tertiary-no-outline" onClick={onClose}>← Retour</button>
          <h1 className="fr-h3 fr-mt-1w" style={{ display: "inline-block", marginLeft: "1rem" }}>
            {draft.metadata.label}
          </h1>
          <p className="fr-text--xs">
            <code>{slug}</code> · v{draft.schemaVersion}
          </p>
        </div>
        <div className="fr-col-auto">
          {lockStatus === "held-by-other" ? (
            <span className="fr-badge fr-badge--warning fr-mr-1w">
              Lecture seule — édité par {lockHeldBy} ·{" "}
              <button
                type="button"
                onClick={() => void handleForceTakeOver()}
                style={{ background: "none", border: "none", textDecoration: "underline" }}
              >
                forcer
              </button>
            </span>
          ) : null}
          {lockStatus === "acquired" ? (
            <span className="fr-badge fr-badge--success fr-mr-1w">Vous éditez</span>
          ) : null}
          <button
            type="button"
            className="fr-btn fr-btn--secondary fr-mr-1w"
            onClick={() => void handleSave()}
            disabled={!editable || saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
          </button>
          <button
            type="button"
            className="fr-btn"
            onClick={() => void handlePublish()}
            disabled={!editable || saving}
          >
            Publier
          </button>
        </div>
      </div>

      {error ? <div className="fr-alert fr-alert--error fr-mb-2w"><p>{error}</p></div> : null}

      <CoherenceChecker simulator={draft} />

      {/* Sidemenu layout : navigation à gauche, contenu pleine largeur à droite */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {/* LEFT — sidemenu */}
        <div className="fr-col-12 fr-col-md-3">
          <nav
            className="fr-sidemenu"
            role="navigation"
            aria-labelledby="sidemenu-title"
            style={{ position: "sticky", top: "1rem" }}
          >
            <div className="fr-sidemenu__inner">
              <button
                className="fr-sidemenu__btn"
                aria-controls="sidemenu-wrapper"
                aria-expanded="false"
              >
                Sections
              </button>
              <div className="fr-collapse" id="sidemenu-wrapper">
                <div className="fr-sidemenu__title" id="sidemenu-title">
                  Édition du simulateur
                </div>
                <ul className="fr-sidemenu__list">
                  {SECTION_ORDER.map((s) => (
                    <li
                      key={s}
                      className={`fr-sidemenu__item${s === section ? " fr-sidemenu__item--active" : ""}`}
                    >
                      <button
                        type="button"
                        className="fr-sidemenu__link"
                        aria-current={s === section ? "page" : undefined}
                        onClick={() => setSection(s)}
                      >
                        {s === "test" ? (
                          <>
                            <span className="fr-icon-play-circle-line fr-icon--sm" aria-hidden="true" />{" "}
                            {SECTION_LABELS[s]}
                          </>
                        ) : (
                          SECTION_LABELS[s]
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Actions toujours visibles */}
                <div
                  className="fr-mt-3w fr-pt-2w"
                  style={{ borderTop: "1px solid var(--border-default-grey)" }}
                >
                  <p className="fr-text--xs fr-mb-1w" style={{ opacity: 0.7 }}>
                    Intégration & export
                  </p>
                  <a
                    href={`http://localhost:5173?sim=${encodeURIComponent(slug)}&source=api`}
                    target="_blank"
                    rel="noopener"
                    className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-right fr-icon-external-link-line fr-mb-1w"
                    style={{ display: "block", textAlign: "center" }}
                    title="Ouvrir dans un onglet standalone (prêt à iframe)"
                  >
                    Aperçu pleine page
                  </a>
                  <button
                    type="button"
                    className="fr-btn fr-btn--tertiary fr-btn--sm"
                    style={{ display: "block", width: "100%", textAlign: "center" }}
                    onClick={() => handleExportJson()}
                    title="Télécharger la définition JSON"
                  >
                    Télécharger la définition
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* RIGHT — contenu de la section sélectionnée (pleine largeur) */}
        <div className="fr-col-12 fr-col-md-9">
          <div
            style={{
              border: "1px solid var(--border-default-grey)",
              borderRadius: 4,
              padding: "1.5rem",
              backgroundColor: "var(--background-default-grey)",
              minHeight: "60vh",
            }}
          >
            {section === "metadata" ? (
              <MetadataForm
                value={draft.metadata}
                onChange={(metadata) => setDraft({ ...draft, metadata })}
                slugLocked={true}
              />
            ) : section === "data" ? (
              <DataEditor
                data={draft.data}
                onChange={(data) => setDraft({ ...draft, data })}
                sources={draft.sources}
                editable={editable}
              />
            ) : section === "sources" ? (
              <SourcesEditor
                sources={draft.sources}
                onChange={(sources) => setDraft({ ...draft, sources })}
                data={draft.data}
                editable={editable}
              />
            ) : section === "steps" ? (
              <StepsEditor
                steps={draft.steps}
                onChange={(steps) => setDraft({ ...draft, steps })}
                data={draft.data}
                editable={editable}
              />
            ) : section === "rules" ? (
              <RulesEditor
                rules={draft.rules}
                onChange={(rules) => setDraft({ ...draft, rules })}
                data={draft.data}
                editable={editable}
              />
            ) : section === "json" ? (
              <JsonEditor value={draft} onChange={(v) => setDraft(v)} height="70vh" />
            ) : (
              <TestPanel
                draft={draft}
                functions={functions}
                hasNonInlineSources={hasNonInlineSources}
                slug={slug}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TestPanelProps {
  draft: Simulator;
  functions: ReturnType<typeof createStandardRegistry>;
  hasNonInlineSources: boolean;
  slug: string;
}

function TestPanel({ draft, functions, hasNonInlineSources, slug }: TestPanelProps): JSX.Element {
  return (
    <div>
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <h2 className="fr-h4" style={{ margin: 0 }}>
            <span className="fr-icon-play-circle-line" aria-hidden="true" /> Tester
          </h2>
          <p className="fr-text--xs" style={{ opacity: 0.7, margin: 0 }}>
            Aperçu live — moteur exécuté côté navigateur, instantané.
          </p>
        </div>
        <div className="fr-col-auto">
          <a
            href={`http://localhost:5173?sim=${encodeURIComponent(slug)}&source=api`}
            target="_blank"
            rel="noopener"
            className="fr-link fr-icon-external-link-line fr-link--icon-right"
          >
            Aperçu pleine page
          </a>
        </div>
      </div>
      {hasNonInlineSources ? (
        <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
          <p className="fr-text--sm">
            Ce simulateur utilise des sources <code>database</code>/<code>api</code> non résolvables
            côté client : l'aperçu ci-dessous est partiel. Le mode standalone (lien ci-dessus)
            appelle l'API en mode hébergé pour résolution complète.
          </p>
        </div>
      ) : null}
      <div
        style={{
          border: "1px solid var(--border-default-grey)",
          borderRadius: 4,
          padding: "1rem",
          backgroundColor: "var(--background-default-white)",
        }}
      >
        <RuntimeSimulator key={draft.metadata.name} definition={draft} functions={functions} />
      </div>
    </div>
  );
}
