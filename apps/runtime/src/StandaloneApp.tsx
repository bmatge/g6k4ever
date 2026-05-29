import "@codegouvfr/react-dsfr/dsfr/dsfr.min.css";
import "@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css";

import { useEffect, useMemo, useState, type JSX } from "react";
import type { Simulator as SimulatorDef } from "@g6k4ever/schema";
import { Simulator as SimulatorSchema } from "@g6k4ever/schema";
import { createStandardRegistry as createFunctionsRegistry } from "@g6k4ever/functions";
import { Simulator } from "./Simulator.js";
import { fraisLocataireInline } from "./frais-locataire-inline.js";
import { voitureTcoInline } from "./voiture-tco-inline.js";
import { pompeAChaleurInline } from "./pompe-a-chaleur-inline.js";
import { factCheckerInline } from "./fact-checker-inline.js";

const functions = createFunctionsRegistry();

interface CatalogEntry {
  slug: string;
  label: string;
  description: string;
  definition: SimulatorDef;
  initialInput: Record<string, unknown>;
}

const CATALOG: CatalogEntry[] = [
  {
    slug: "frais-locataire",
    label: "Frais de mise en location",
    description: "Zonage des communes et tarif maximum imputable au locataire.",
    definition: fraisLocataireInline,
    initialInput: { commune: "35238" },
  },
  {
    slug: "voiture-tco",
    label: "TCO voiture — électrique vs thermique",
    description: "TCO comparatif avec bonus écologique par tranche RFR.",
    definition: voitureTcoInline,
    initialInput: {},
  },
  {
    slug: "pompe-a-chaleur",
    label: "Coût d'une pompe à chaleur après aides",
    description: "Besoin utile, MaPrimeRénov', économie annuelle, amortissement.",
    definition: pompeAChaleurInline,
    initialInput: {},
  },
  {
    slug: "fact-checker-voiture-electrique",
    label: "Fact-checker — voiture électrique",
    description:
      "Arbre de décision pédagogique : 5 familles d'interrogations × 17 sujets sourcés. Démontre le mode `outputKind: decision` avec navigation conditionnelle.",
    definition: factCheckerInline,
    initialInput: {},
  },
];

/**
 * App principale du runtime — gère 3 modes :
 *   1. URL `/`              → galerie avec sélecteur (CATALOG complet)
 *   2. URL `/?sim=<slug>`    → simulateur unique (catalogue ou API)
 *   3. URL `/?sim=<slug>&source=api` → forcer le fetch depuis l'API
 *
 * Mode standalone (#2 / #3) : pas de header DSFR, juste le simulateur, prêt
 * pour iframe.
 */
export function StandaloneApp(): JSX.Element {
  const url = new URL(window.location.href);
  const simParam = url.searchParams.get("sim");
  const sourceParam = url.searchParams.get("source");
  const apiBase = url.searchParams.get("api") ?? "http://localhost:3000";

  if (!simParam) {
    return <Gallery />;
  }

  return <SingleSimulator slug={simParam} forceApi={sourceParam === "api"} apiBase={apiBase} />;
}

function Gallery(): JSX.Element {
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
                    <p className="fr-logo">g6k<br />4ever</p>
                  </div>
                </div>
                <div className="fr-header__service">
                  <p className="fr-header__service-title">Runtime — démo standalone</p>
                  <p className="fr-header__service-tagline">
                    Moteur custom exécuté côté client
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
              <label className="fr-label" htmlFor="sim-selector">Simulateur</label>
              <select
                id="sim-selector"
                className="fr-select"
                value={currentSlug}
                onChange={(e) => setCurrentSlug(e.target.value)}
              >
                {CATALOG.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="fr-col-12 fr-col-md-6">
            <p className="fr-text--sm" style={{ marginTop: "2.2rem", opacity: 0.85 }}>
              {current.description}
            </p>
            <p className="fr-text--xs" style={{ opacity: 0.7 }}>
              Vue standalone :{" "}
              <a href={`?sim=${current.slug}`} className="fr-link fr-link--sm">
                ouvrir uniquement ce simulateur ↗
              </a>
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
      </main>

      <footer className="fr-footer">
        <div className="fr-container">
          <div className="fr-footer__body fr-py-3w">
            <p className="fr-text--xs">
              g6k4ever — runtime React + DSFR. Pour intégrer un simulateur dans votre site,
              utilisez <code>&lt;iframe src="?sim=&lt;slug&gt;"&gt;</code> ou importez la
              définition JSON et le composant <code>&lt;Simulator&gt;</code>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface SingleProps {
  slug: string;
  forceApi: boolean;
  apiBase: string;
}

function SingleSimulator({ slug, forceApi, apiBase }: SingleProps): JSX.Element {
  const fromCatalog = useMemo(
    () => (forceApi ? undefined : CATALOG.find((s) => s.slug === slug)),
    [slug, forceApi],
  );

  const [definition, setDefinition] = useState<SimulatorDef | undefined>(
    fromCatalog?.definition,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!fromCatalog);

  useEffect(() => {
    if (fromCatalog) {
      setDefinition(fromCatalog.definition);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${apiBase}/simulators/${encodeURIComponent(slug)}?version=draft`)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((data: { simulator: { draftDefinition: unknown } }) => {
        if (cancelled) return;
        const parsed = SimulatorSchema.safeParse(data.simulator.draftDefinition);
        if (!parsed.success) {
          setError("Simulateur invalide retourné par l'API");
          return;
        }
        setDefinition(parsed.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, fromCatalog, apiBase]);

  if (error) {
    return (
      <div className="fr-container fr-py-4w">
        <div className="fr-alert fr-alert--error">
          <p>Erreur de chargement du simulateur « {slug} » : {error}</p>
        </div>
      </div>
    );
  }
  if (loading || !definition) {
    return (
      <div className="fr-container fr-py-4w">
        <p>Chargement de {slug}…</p>
      </div>
    );
  }

  // Vue standalone minimale, idéale pour iframe.
  return (
    <main className="fr-container fr-py-4w">
      <h1 className="fr-h2">{definition.metadata.label}</h1>
      {definition.metadata.description ? (
        <p className="fr-text--lead">{definition.metadata.description}</p>
      ) : null}
      <Simulator
        key={slug}
        definition={definition}
        functions={functions}
        initialInput={fromCatalog?.initialInput ?? {}}
      />
      <p className="fr-text--xs fr-mt-4w" style={{ opacity: 0.55 }}>
        Propulsé par <a href="https://github.com/bmatge/g6k4ever">g6k4ever</a>
      </p>
    </main>
  );
}
