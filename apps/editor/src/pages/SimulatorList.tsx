import { useEffect, useState, type JSX } from "react";
import type { ApiClient, SimulatorSummary } from "../api-client.js";
import { createBlankSimulator } from "../templates.js";

interface SimulatorListProps {
  api: ApiClient;
  onSelect: (slug: string) => void;
}

export function SimulatorList({ api, onSelect }: SimulatorListProps): JSX.Element {
  const [simulators, setSimulators] = useState<SimulatorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const reload = async (): Promise<void> => {
    setError(null);
    try {
      const res = await api.list();
      setSimulators(res.simulators);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void reload();
  }, [api]);

  const handleCreate = async (): Promise<void> => {
    if (!newSlug.trim() || !newLabel.trim()) return;
    setError(null);
    try {
      const def = createBlankSimulator(newSlug.trim(), newLabel.trim());
      const res = await api.create(def);
      setCreating(false);
      setNewSlug("");
      setNewLabel("");
      onSelect(res.simulator.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fr-container fr-py-4w">
      <h1 className="fr-h2">Vos simulateurs</h1>
      {error ? (
        <div className="fr-alert fr-alert--error fr-mb-2w">
          <p>{error}</p>
        </div>
      ) : null}

      <div className="fr-mb-2w">
        <button
          type="button"
          className="fr-btn"
          onClick={() => setCreating(!creating)}
        >
          {creating ? "Annuler" : "+ Nouveau simulateur"}
        </button>
        <button
          type="button"
          className="fr-btn fr-btn--tertiary-no-outline fr-ml-2w"
          onClick={() => void reload()}
        >
          Recharger
        </button>
      </div>

      {creating ? (
        <div className="fr-card fr-card--horizontal fr-mb-2w">
          <div className="fr-card__body">
            <div className="fr-card__content">
              <h3 className="fr-card__title">Nouveau simulateur</h3>
              <div className="fr-input-group">
                <label className="fr-label" htmlFor="new-slug">
                  Slug (identifiant URL)
                </label>
                <input
                  id="new-slug"
                  className="fr-input"
                  type="text"
                  placeholder="mon-simulateur"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                />
              </div>
              <div className="fr-input-group">
                <label className="fr-label" htmlFor="new-label">
                  Libellé public
                </label>
                <input
                  id="new-label"
                  className="fr-input"
                  type="text"
                  placeholder="Mon simulateur"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <button type="button" className="fr-btn fr-mt-2w" onClick={() => void handleCreate()}>
                Créer et ouvrir
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {simulators === null ? (
        <p>Chargement…</p>
      ) : simulators.length === 0 ? (
        <p className="fr-text--lead">Aucun simulateur. Cliquez sur « + Nouveau simulateur » pour démarrer.</p>
      ) : (
        <div className="fr-grid-row fr-grid-row--gutters">
          {simulators.map((sim) => (
            <div key={sim.slug} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
              <div className="fr-card fr-enlarge-link">
                <div className="fr-card__body">
                  <div className="fr-card__content">
                    <h3 className="fr-card__title">
                      <a href="#" onClick={(e) => { e.preventDefault(); onSelect(sim.slug); }}>
                        {sim.label}
                      </a>
                    </h3>
                    <p className="fr-card__desc">
                      <code>{sim.slug}</code>
                      {sim.hasPublished ? " · publié" : " · brouillon"}
                    </p>
                    <p className="fr-card__detail fr-text--xs">
                      Mis à jour le {new Date(sim.updatedAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
