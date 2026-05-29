# test-e2e — tests end-to-end avec Playwright

Ces scripts sondent les 3 apps en parallèle (API + runtime + éditeur) avec un
navigateur Chromium headless pour valider que **l'UI fonctionne réellement**,
pas juste que les calculs engine sont corrects.

## Pré-requis

```bash
# 1. Installer Chromium pour Playwright (une fois)
npx playwright install chromium

# 2. Démarrer les 3 apps dans 3 terminaux
pnpm dev:api      # http://localhost:3000 (avec seed automatique)
pnpm dev:runtime  # http://localhost:5173
pnpm dev:editor   # http://localhost:5174

# 3. Lancer les tests
pnpm test:e2e
```

## Scripts disponibles

- **`full-e2e.mjs`** (`pnpm test:e2e`) — Suite E2E complète, 18 vérifications.
  Couvre :
  - Runtime : sélecteur de simulateur, valeurs initiales (defaults), saisies,
    sliders range, KPI cohérents, switch entre les 3 simulateurs.
  - Editor : prompt user-id, liste de simulateurs depuis API, ouverture d'un
    simulateur, acquisition du verrou, preview avec defaults, édition dans la
    preview, navigation onglets, édition d'un label de Data.

- **`runtime-smoke.mjs`** — Inspection détaillée du runtime (nombre d'inputs,
  labels, valeurs après modification). Utile pour debugger un cas spécifique.

- **`editor-detail.mjs`** — Inspection détaillée de l'éditeur (lock, preview,
  onglets, formulaires).

- **`runtime-debug.mjs`** / **`runtime-inspect.mjs`** — Outils d'inspection
  ponctuelle (HTML rendu, sélecteurs CSS) — surtout utilisés pour diagnostiquer
  les bugs DSFR (ex. range slider mangé par fr-range__output).

## Pourquoi pas un harness automatisé ?

L'orchestration des 3 dev servers (avec leur lifecycle indépendant : tsx watch,
Vite HMR, DB recréation entre runs) demanderait un test runner type Playwright
Test avec `webServer` config. Pour l'instant, on garde des scripts Node.js
simples qui assument que l'utilisateur lance les 3 commandes dans des terminaux
séparés et termine par `pnpm test:e2e`.

À considérer en Phase suivante : intégrer dans `@playwright/test` avec
fixtures pour spin up/down automatique des serveurs, et utiliser dans la CI.
