import { useMemo, useState, type JSX } from "react";
import { ApiClient } from "./api-client.js";
import { SimulatorList } from "./pages/SimulatorList.js";
import { SimulatorEditor } from "./pages/SimulatorEditor.js";

/**
 * Identité utilisateur — pour Phase 7a, on demande un identifiant à l'amorçage
 * et on le persiste dans localStorage. Sera remplacé par un mécanisme d'auth
 * réel (JWT, session) en Phase 7.3.
 */
function useUserId(): { userId: string | null; setUserId: (id: string) => void } {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem("g6k4ever:userId") : null;
  const [userId, setUserIdState] = useState<string | null>(stored);
  return {
    userId,
    setUserId(id: string) {
      window.localStorage.setItem("g6k4ever:userId", id);
      setUserIdState(id);
    },
  };
}

const API_BASE = import.meta.env["VITE_API_BASE"] ?? "http://localhost:3000";

export function App(): JSX.Element {
  const { userId, setUserId } = useUserId();
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  const api = useMemo(
    () => (userId ? new ApiClient({ baseUrl: API_BASE, userId }) : null),
    [userId],
  );

  if (!userId) {
    return <UserIdPrompt onSubmit={setUserId} />;
  }

  return (
    <div>
      <header className="fr-header" role="banner">
        <div className="fr-header__body">
          <div className="fr-container">
            <div className="fr-header__body-row">
              <div className="fr-header__brand">
                <div className="fr-header__brand-top">
                  <div className="fr-header__logo">
                    <p className="fr-logo">
                      g6k
                      <br />
                      4ever
                    </p>
                  </div>
                </div>
                <div className="fr-header__service">
                  <p className="fr-header__service-title">Éditeur no-code</p>
                  <p className="fr-header__service-tagline">
                    Connecté en tant que <strong>{userId}</strong>{" "}
                    <button
                      type="button"
                      onClick={() => {
                        window.localStorage.removeItem("g6k4ever:userId");
                        window.location.reload();
                      }}
                      style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
                    >
                      (changer)
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {api ? (
          currentSlug ? (
            <SimulatorEditor api={api} slug={currentSlug} onClose={() => setCurrentSlug(null)} />
          ) : (
            <SimulatorList api={api} onSelect={setCurrentSlug} />
          )
        ) : null}
      </main>
    </div>
  );
}

function UserIdPrompt({ onSubmit }: { onSubmit: (id: string) => void }): JSX.Element {
  const [value, setValue] = useState("");
  return (
    <div className="fr-container fr-py-6w">
      <h1 className="fr-h2">Bienvenue dans l'éditeur g6k4ever</h1>
      <p className="fr-text--lead">
        Entrez un identifiant pour démarrer (placeholder pour l'authentification, à venir en Phase 7.3).
      </p>
      <div className="fr-input-group" style={{ maxWidth: 400 }}>
        <label className="fr-label" htmlFor="user-id">
          Votre identifiant
        </label>
        <input
          className="fr-input"
          id="user-id"
          type="text"
          placeholder="alice"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className="fr-btn fr-mt-2w"
          onClick={() => value.trim() && onSubmit(value.trim())}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
