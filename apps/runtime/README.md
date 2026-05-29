# @g6k4ever/runtime

**Runtime React + `@codegouvfr/react-dsfr`.** Composant `<Simulator>` qui prend une définition de simulateur, exécute `@g6k4ever/engine` **côté client**, et rend le DOM via le registre de blocs `@g6k4ever/blocks`. Phase 7.2b ajoute `<SimulatorViaApi>` pour évaluer via l'API (utile pour les sources `database`/`api`).

> 📌 **Phases 6 + 6.2 livrées**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`runtime-dev`](../../.claude/agents/runtime-dev.md).

## Lancer la démo

```bash
pnpm build                                  # build des packages amont
pnpm --filter @g6k4ever/runtime dev         # http://localhost:5173
```

## API publique

### Mode local (engine côté client)

```tsx
import { Simulator, fraisLocataireInline } from "@g6k4ever/runtime";
import { createStandardRegistry } from "@g6k4ever/functions";

<Simulator
  definition={fraisLocataireInline}
  functions={createStandardRegistry()}
  initialInput={{ commune: "75056" }}
/>
```

### Mode API (l'évaluation passe par le backend — supporte database/api)

```tsx
import { SimulatorViaApi, deserializeSimulatorState } from "@g6k4ever/runtime";

const evaluator = {
  async evaluate(simulator, input) {
    const res = await fetch("/api/run-stateless", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulator, input }),
    });
    const { state } = await res.json();
    return deserializeSimulatorState(state);
  },
};

<SimulatorViaApi
  definition={mySimulator}
  evaluator={evaluator}
  debounceMs={300}
/>
```

## Builds production (Phase 6.2)

Deux modes de build de la **librairie** (différents du SPA demo qui sert `dev`) :

```bash
pnpm --filter @g6k4ever/runtime build:lib:embedded   # ≤ 30kB gz — React+DSFR externes
pnpm --filter @g6k4ever/runtime build:lib:standalone # ≤ 45kB gz — React bundlé, DSFR externe
```

Mesure du poids gzipped avec garde-fou :

```bash
pnpm --filter @g6k4ever/runtime measure:embedded
# Sortie :
#   📦 @g6k4ever/runtime — bundle embedded
#     Fichier                                     Raw    Gzipped
#     ──────────────────────────────────── ────────── ──────────
#     index.js                               136.2 kB    28.9 kB
#     ──────────────────────────────────── ────────── ──────────
#     TOTAL                                  136.2 kB    28.9 kB
#     Budget : 120.0 kB gzipped — ✓ sous budget (-91.1 kB)
```

Le script exit avec code 1 si on dépasse le budget ≤120 kB gz (cf. [`CLAUDE.md`](../../CLAUDE.md) §11) — utilisable en CI.

### Mode embedded

Externalise `react`, `react-dom`, `react/jsx-runtime`, `@codegouvfr/react-dsfr/*`. Assume que le portail hôte les charge.

→ **Bundle ≈ 29 kB gz** (engine + blocks + schema + jsep + nos composants)

### Mode standalone

Externalise uniquement `@codegouvfr/react-dsfr/*` (chargé via CDN officiel DSFR). Bundle React + react-dom inclus.

→ **Bundle ≈ 41 kB gz**

> Note : pour un déploiement vraiment autonome sans DSFR CDN, ajouter DSFR aux deps bundlées augmenterait le bundle d'environ +100 kB gz. Considéré comme inutile : tout simulateur public utilise déjà DSFR ailleurs sur la page.

## Architecture

- **`<Simulator>`** maintient l'`input` user dans `useState`. À chaque changement, recompute le `SimulatorState` via `evaluate(definition, input, ...)`.
- **`<SimulatorViaApi>`** : variante async qui debounce les changements (300ms) et appelle un evaluator serveur. Utile quand le simulateur a des sources `database`/`api` (sinon InlineOnlyResolver côté client suffit).
- **`<StepView>`** rend une étape avec ses blocs filtrés par visibilité.
- **`<BlocksList>`** descend récursivement dans les blocs envelope (`chapter`, `blockinfo`) et appelle le `render` du bloc lookupé dans le registre.

### Visibilité multi-types

Les règles `showObject`/`hideObject` ciblent des types sémantiques (`section`, `chapter`, `blockinfo`, `footnote`) tandis que les blocs concrets ont des types techniques (`text-section`, `kpi-card`, `accordion`…). Le runtime résout la visibilité par **ID** plutôt que par couple `type:id`.

## Tests

7 tests d'intégration React Testing Library (jsdom) sur le composant `<Simulator>` local.

```bash
pnpm --filter @g6k4ever/runtime test
```

## Règle non négociable

**Aucun calcul recodé.** Tout passe par `@g6k4ever/engine`. Les blocs **consomment** l'état, ils ne calculent pas (cf. [`CLAUDE.md`](../../CLAUDE.md) §4).
