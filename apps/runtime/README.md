# @g6k4ever/runtime

**Runtime React + `@codegouvfr/react-dsfr`.** Composant `<Simulator>` qui prend une définition de simulateur, exécute `@g6k4ever/engine` **côté client**, et rend le DOM via le registre de blocs `@g6k4ever/blocks`.

> 📌 **Phase 6 livrée**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`runtime-dev`](../../.claude/agents/runtime-dev.md).

## Lancer la démo

```bash
pnpm build                                  # build des packages amont
pnpm --filter @g6k4ever/runtime dev         # http://localhost:5173
```

Ouvre la page, tape un code INSEE (`75056` Paris, `35238` Rennes, `48095` Mende…) et le simulateur réagit en live — sections de zonage qui s'affichent/se masquent selon la règle métier, texte interpolé avec `#3` (nom de la commune).

## API publique

```tsx
import { Simulator, fraisLocataireInline } from "@g6k4ever/runtime";
import { createStandardRegistry } from "@g6k4ever/functions";

const functions = createStandardRegistry();

<Simulator
  definition={fraisLocataireInline}    // un Simulator (validé par Zod)
  functions={functions}                  // FunctionRegistry (standard + métier)
  initialInput={{ commune: "75056" }}   // entrées initiales (par nom de Data)
  // resolver: ...                       // optionnel — défaut = inline only
  // blocks: ...                         // optionnel — défaut = createStandardRegistry de @g6k4ever/blocks
  // maxIterations: 10                  // optionnel
/>
```

## Architecture

- **`<Simulator>`** maintient l'`input` user dans `useState`. À chaque changement, recompute le `SimulatorState` via `evaluate(definition, input, ...)`.
- **`<StepView>`** rend une étape avec ses blocs filtrés par visibilité.
- **`<BlocksList>`** descend récursivement dans les blocs envelope (`chapter`, `blockinfo`) et appelle le `render` du bloc lookupé dans le registre.
- **`<NotificationsView>`** affiche les `notifyError`/`notifyWarning` du moteur.

### Visibilité multi-types

Les règles `showObject`/`hideObject` ciblent des types sémantiques (`section`, `chapter`, `blockinfo`, `footnote`) tandis que les blocs concrets ont des types techniques (`text-section`, `kpi-card`, `accordion`…). Le runtime résout la visibilité par **ID** plutôt que par couple `type:id`, ce qui permet aux règles de fonctionner sans connaître l'implémentation visuelle.

## Datasources

Par défaut, un `InlineOnlyResolver` interne sert les sources `inline` directement depuis la définition. Pour des sources `database`/`api` (cf. Phase 5.2), passer un `resolver` custom (par ex. un client qui appelle `apps/api`).

## Tests

7 tests d'intégration React Testing Library (jsdom) :

- rendu de l'étape et du champ
- absence de section au démarrage
- affichage de la bonne zone pour Paris / Rennes / Mende
- interaction utilisateur : changer la saisie → re-render automatique avec le bon résultat

```bash
pnpm --filter @g6k4ever/runtime test
```

## À venir (Phase 6.2)

- Build mode `embedded` (suppose DSFR initialisé par le host) vs `standalone` (ship DSFR), via deux configs Vite.
- Mesure et garde-fou bundle size (≤ 120kB gz hors DSFR, cf. CLAUDE.md §11).
- Variante `<SimulatorViaApi>` qui appelle `POST /simulators/:slug/run` au lieu de tourner l'engine en local — utile pour les modes hébergés.
- Blocs manquants : `chapter`, `accordion` à items conditionnels, `breakdown-table`, `notification`, `footnote`, `reset-button` (en parallèle de la Phase 7 — éditeur).

## Règle non négociable

**Aucun calcul recodé.** Tout passe par `@g6k4ever/engine`. Les blocs **consomment** l'état, ils ne calculent pas (cf. [`CLAUDE.md`](../../CLAUDE.md) §4).
