import "@codegouvfr/react-dsfr/dsfr/dsfr.min.css";
import "@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css";

import { useState, type JSX } from "react";
import type { Simulator as SimulatorDef } from "@g6k4ever/schema";
import { createStandardRegistry as createFunctionsRegistry } from "@g6k4ever/functions";
import { Simulator } from "./Simulator.js";
import { fraisLocataireInline } from "./frais-locataire-inline.js";
import { voitureTcoInline } from "./voiture-tco-inline.js";
import { pompeAChaleurInline } from "./pompe-a-chaleur-inline.js";

const functions = createFunctionsRegistry();

interface SimulatorEntry {
  slug: string;
  label: string;
  description: string;
  definition: SimulatorDef;
  initialInput: Record<string, unknown>;
}

const CATALOG: SimulatorEntry[] = [
  {
    slug: "frais-locataire",
    label: "Frais de mise en location",
    description:
      "Arbre de décision : zonage des communes (Paris, Rennes, Mende…) et tarif maximum imputable au locataire.",
    definition: fraisLocataireInline,
    initialInput: { commune: "35238" },
  },
  {
    slug: "voiture-tco",
    label: "TCO voiture — électrique vs thermique",
    description:
      "Calcul : compare le coût total de possession sur N années avec bonus écologique par tranche RFR.",
    definition: voitureTcoInline,
    initialInput: {
      km: 12000,
      duree: 5,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "1",
      pkwh: 0.2,
      pessence: 1.9,
    },
  },
  {
    slug: "pompe-a-chaleur",
    label: "Coût d'une pompe à chaleur après aides",
    description:
      "Calcul : besoin utile (zone × isolation), MaPrimeRénov', économies vs chauffage actuel, durée d'amortissement.",
    definition: pompeAChaleurInline,
    initialInput: {
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    },
  },
];

export function DemoApp(): JSX.Element {
  const [currentSlug, setCurrentSlug] = useState(CATALOG[0]!.slug);
  const current = CATALOG.find((s) => s.slug === currentSlug) ?? CATALOG[0]!;

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
                  <p className="fr-header__service-title">Runtime — démo standalone</p>
                  <p className="fr-header__service-tagline">
                    Moteur custom <code>@g6k4ever/engine</code> exécuté côté client
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="fr-container fr-py-4w">
        <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
          <div className="fr-col-12 fr-col-md-6">
            <div className="fr-select-group">
              <label className="fr-label" htmlFor="sim-selector">
                Simulateur à exécuter
              </label>
              <select
                id="sim-selector"
                className="fr-select"
                value={currentSlug}
                onChange={(e) => setCurrentSlug(e.target.value)}
              >
                {CATALOG.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="fr-col-12 fr-col-md-6">
            <p className="fr-text--sm" style={{ marginTop: "2.2rem", opacity: 0.85 }}>
              {current.description}
            </p>
          </div>
        </div>

        <article aria-label={current.label}>
          <h1 className="fr-h2">{current.definition.metadata.label}</h1>
          {current.definition.metadata.description ? (
            <p className="fr-text--lead">{current.definition.metadata.description}</p>
          ) : null}
          <Simulator
            key={current.slug}
            definition={current.definition}
            functions={functions}
            initialInput={current.initialInput}
          />
        </article>

        <details className="fr-mt-6w">
          <summary className="fr-text--sm">État brut de la définition (debug)</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}>
            {JSON.stringify(current.definition, null, 2)}
          </pre>
        </details>
      </main>

      <footer className="fr-footer" role="contentinfo">
        <div className="fr-container">
          <div className="fr-footer__body fr-py-3w">
            <p className="fr-text--xs">
              g6k4ever Phase 8d — runtime avec 3 simulateurs sélectionnables :
              frais-locataire, voiture-tco, pompe-a-chaleur. Tous calculés côté client par le
              moteur custom.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
