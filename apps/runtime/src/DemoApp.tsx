import "@codegouvfr/react-dsfr/dsfr/dsfr.min.css";
import "@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css";

import type { JSX } from "react";
import { createStandardRegistry as createFunctionsRegistry } from "@g6k4ever/functions";
import { Simulator } from "./Simulator.js";
import { fraisLocataireInline } from "./frais-locataire-inline.js";

const functions = createFunctionsRegistry();

/**
 * App de démo standalone — rend le simulateur `frais-locataire` (variante
 * inline pour exécution côté client) avec une UI DSFR basique.
 */
export function DemoApp(): JSX.Element {
  return (
    <div>
      <header className="fr-header" role="banner">
        <div className="fr-header__body">
          <div className="fr-container">
            <div className="fr-header__body-row">
              <div className="fr-header__brand fr-enlarge-link">
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
                  <p className="fr-header__service-title">Runtime — Démo standalone</p>
                  <p className="fr-header__service-tagline">
                    Reproduction de <code>frais-locataire</code> via @g6k4ever/runtime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="fr-container fr-py-6w">
        <h1 className="fr-h2">{fraisLocataireInline.metadata.label}</h1>
        {fraisLocataireInline.metadata.description ? (
          <p className="fr-text--lead">{fraisLocataireInline.metadata.description}</p>
        ) : null}

        <Simulator definition={fraisLocataireInline} functions={functions} />

        <details className="fr-mt-6w">
          <summary className="fr-text--sm">État brut (debug)</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>
            {JSON.stringify(fraisLocataireInline, null, 2)}
          </pre>
        </details>
      </main>

      <footer className="fr-footer" role="contentinfo">
        <div className="fr-container">
          <div className="fr-footer__body fr-py-3w">
            <p className="fr-text--xs">
              g6k4ever Phase 6 — runtime exécutant le moteur custom (jsep + walker) côté client.
              Voir <code>ROADMAP.md</code>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
