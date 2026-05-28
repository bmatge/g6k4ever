# ROADMAP — g6k4ever

> Décision fondatrice : [ADR-028](../../Documents/Obsidian/30-Knowledge/ADR/ADR-028-g6k4ever-no-code-typescript-dsfr.md). Périmètre fonctionnel et critères d'acceptation : [`_corpus/targets.md`](./_corpus/targets.md).

Chaque phase produit un livrable concret validé par l'humain avant d'enchaîner. Les sous-agents Claude Code attachés à chaque phase vivent dans [`.claude/agents/`](./.claude/agents/).

## Phase 0 — Bootstrap ✅

**Statut** : ✅ terminé (commit `9353b71`)

- [x] Monorepo pnpm + Turborepo
- [x] Configs TS strict, ESLint 9 flat, Prettier 3, Vitest 2
- [x] Arborescence `packages/{schema,engine,blocks,functions}` + `apps/{api,runtime,editor}`
- [x] `ROADMAP.md`

## Phase 1 — Analyse ✅

**Statut** : ✅ terminé (commit incluant `docs/analysis/`)

Livré :
- [x] `docs/analysis/g6k-model.md` — modèle de données G6K
- [x] `docs/analysis/expressions-grammar.md` — grammaire jsep-compatible
- [x] `docs/analysis/corpus-patterns.md` — fiche par simulateur + primitives MVP
- [x] `docs/analysis/guided-vs-expert.md` — frontière entre les deux modes
- [x] `docs/analysis/decisions.md` — D1 fixed-point, D2 pas de littéral date, D3 connecteur `none`

## Phase 2 — Schéma ✅

**Statut** : ✅ terminé (commit `76ba9b2`)

- [x] `packages/schema` — schéma Zod versionné (Data, Source, Condition, Action, Rule, Step, Simulator)
- [x] JSON Schema via `zod-to-json-schema`
- [x] 2 exemples transcrits depuis les XML
- [x] `docs/schema.md`
- [x] 8 tests verts (safeParse + invariants)

## Phase 3 — Moteur + Fonctions ✅

**Statut** : ✅ terminé (commit `78e4030`). Précédé de l'**ADR-029** (build vs buy : custom retenu vs SurveyJS/JSON Logic/JEXL/JSONForms).

- [x] `packages/engine` TS pur (parser jsep + AST walker + condition evaluator + action applier + fixed-point pipeline)
- [x] `packages/functions` registre standard (sum, floor, max, min, count, year, date, strftime) + extension métier
- [x] Pas d'`eval()` / `new Function()`
- [x] 33 tests engine (21 expression + 12 golden frais-locataire/taxeLogementsVacants) + 11 tests functions = 44 tests verts

## Phase 4 — Blocs ✅ (stub)

**Statut** : ✅ partiel (commit `6b22ad0`) — interface canonique + 3 blocs de référence. Les autres blocs s'ajouteront en Phases 6 et 7.

Livré :
- [x] `BlockDefinition<TConfig>` (configSchema Zod, editorMeta, readsDataIds, writesDataIds, render React)
- [x] `BlockRegistry` (register/has/get/list/validate)
- [x] `text-section`, `field` (11 types + range), `kpi-card`
- [x] React 19 + react-dsfr 1.32
- [x] 14 tests blocks verts (schéma + dépendances de données)

Restant à implémenter (en Phase 6/7 quand consommés) :
- `chapter` / `blockinfo` (envelopes conditionnelles)
- `accordion` à items conditionnels (corpus `changer-de-classe`)
- `breakdown-table` (corpus `voiture` / `poids-lourd`)
- `notification` (sortie des `notifyError`/`notifyWarning` du moteur)
- `footnote`, `reset-button`

## Phase 5 — API (`api-dev`)

**Statut** : ⚪ à venir — **PROCHAINE PHASE**

**Décisions à acter en amont** :
- Persistance : SQLite brut vs Drizzle vs Prisma vs better-sqlite3 + kysely
- Lock d'édition : mécanisme (timeout, take-over, user ID provenance)
- Datasources `database` externes : pool de connexions ? credentials chiffrés en DB ?
- Sortie OpenAPI : `hono/zod-openapi` ou écriture manuelle

- `apps/api` — Hono + SQLite (accès DB isolé).
- CRUD définitions, `/run`, datasources (`database`, `api`), lock, versions, export.
- OpenAPI généré (hono/zod-openapi).
- Tests d'intégration : rejeu d'un simulateur du corpus via l'API = même résultat que via l'engine.

**Critère de sortie** : tests d'intégration verts ; rejeu de `frais-locataire` via `curl` OK.

## Phase 6 — Runtime (`runtime-dev`)

**Statut** : ⚪ à venir

- `apps/runtime` — React + `@codegouvfr/react-dsfr`.
- Deux modes de build : `embedded` et `standalone` (cf. [`CLAUDE.md`](./CLAUDE.md) §11).
- Budget bundle ≤ 120kB gzipped vérifié en CI (porte de sortie Preact si dépassement).
- Reproduction à l'identique de `frais-locataire`.

**Critère de sortie** : capture côte à côte de `frais-locataire` rendu par le runtime vs l'original G6K = identique fonctionnellement.

## Phase 7 — Éditeur (`editor-dev`) — le produit

**Statut** : ⚪ à venir

- `apps/editor` — back-office no-code.
- Composer étapes/blocs par DnD ; règles en mode guidé (arbre `all`/`any`/`none`) avec trappe expert (codemirror) ; datasources et fonctions choisies dans des registres ; textes à variables avec autocomplétion.
- Preview live via le runtime monté en sandbox.
- Vérificateur de cohérence temps réel.
- Lock + versions brouillon/publié + publication (déclenche l'export via l'API).

**Critère de sortie** : recréer `taxeLogementsVacants` de zéro depuis l'éditeur, sans toucher au code.

## Post-MVP — sur feu vert explicite

- Primitive `chart` + bloc DSFR (line, bar, pie) — pour `poids-lourd`, `pompe-a-chaleur`.
- Groupe répétable (déjà prévu au schéma) — pour `gratification-stagiaire`, `forfaits`.
- Datasource `partner-offers.json` — pour `passer-a-electrique`, `pompe-a-chaleur`.
- Cartes interactives (Leaflet) — pour `bornes-ve`, `territoires-electrification`.
- Export PDF / CERFA — lettres guidées.
- Import de simulateurs G6K existants (depuis XML).

## Validation à chaque jalon

À chaque sortie de phase :
1. Brief de livraison rédigé par le sous-agent concerné.
2. Validation humaine explicite avant la phase suivante.
3. Mise à jour de cette `ROADMAP.md` (cocher, ajouter notes).
4. Session loguée dans `~/Documents/Obsidian/20-Sessions/YYYY-MM-DD.md` (frontmatter `projects: [g6k4ever]`).
