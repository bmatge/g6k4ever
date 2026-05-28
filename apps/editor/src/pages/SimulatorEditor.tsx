import { useEffect, useRef, useState, type JSX } from "react";
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

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

interface SimulatorEditorProps {
  api: ApiClient;
  slug: string;
  onClose: () => void;
}

type Tab = "metadata" | "data" | "sources" | "steps" | "rules" | "json";

const TAB_LABELS: Record<Tab, string> = {
  metadata: "Métadonnées",
  data: "Données",
  sources: "Sources",
  steps: "Étapes & blocs",
  rules: "Règles",
  json: "JSON brut",
};

export function SimulatorEditor({ api, slug, onClose }: SimulatorEditorProps): JSX.Element {
  const [draft, setDraft] = useState<Simulator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<"idle" | "acquired" | "held-by-other" | "not-found">("idle");
  const [lockHeldBy, setLockHeldBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("metadata");
  const functions = useRef(createStandardRegistry()).current;

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
              Verrouillé par {lockHeldBy} —{" "}
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
            <span className="fr-badge fr-badge--success fr-mr-1w">Verrou acquis</span>
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

      {/* 2-pane layout */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {/* LEFT — éditeur */}
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist">
              {(["metadata", "data", "sources", "steps", "rules", "json"] as Tab[]).map((t) => (
                <li key={t} role="presentation">
                  <button
                    type="button"
                    className="fr-tabs__tab"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                  >
                    {TAB_LABELS[t]}
                  </button>
                </li>
              ))}
            </ul>
            <div className="fr-tabs__panel fr-tabs__panel--selected" role="tabpanel">
              {tab === "metadata" ? (
                <MetadataForm
                  value={draft.metadata}
                  onChange={(metadata) => setDraft({ ...draft, metadata })}
                  slugLocked={true}
                />
              ) : tab === "data" ? (
                <DataEditor
                  data={draft.data}
                  onChange={(data) => setDraft({ ...draft, data })}
                  editable={editable}
                />
              ) : tab === "sources" ? (
                <SourcesEditor
                  sources={draft.sources}
                  onChange={(sources) => setDraft({ ...draft, sources })}
                  data={draft.data}
                  editable={editable}
                />
              ) : tab === "steps" ? (
                <StepsEditor
                  steps={draft.steps}
                  onChange={(steps) => setDraft({ ...draft, steps })}
                  data={draft.data}
                  editable={editable}
                />
              ) : tab === "rules" ? (
                <RulesEditor
                  rules={draft.rules}
                  onChange={(rules) => setDraft({ ...draft, rules })}
                  data={draft.data}
                  editable={editable}
                />
              ) : (
                <JsonEditor value={draft} onChange={(v) => setDraft(v)} height="60vh" />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — preview live */}
        <div className="fr-col-12 fr-col-md-6">
          <div
            style={{
              border: "1px solid var(--border-default-grey)",
              borderRadius: 4,
              padding: "1rem",
              backgroundColor: "var(--background-default-grey)",
              position: "sticky",
              top: "1rem",
              maxHeight: "calc(100vh - 2rem)",
              overflow: "auto",
            }}
          >
            <p className="fr-text--xs fr-mb-1w" style={{ opacity: 0.7 }}>
              Aperçu live (moteur exécuté côté client) :
            </p>
            <RuntimeSimulator definition={draft} functions={functions} />
          </div>
        </div>
      </div>
    </div>
  );
}
