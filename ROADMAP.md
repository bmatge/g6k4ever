# ROADMAP — g6k4ever

> Décision fondatrice : [ADR-028](../../Documents/Obsidian/30-Knowledge/ADR/ADR-028-g6k4ever-no-code-typescript-dsfr.md). Périmètre fonctionnel et critères d'acceptation : [`_corpus/targets.md`](./_corpus/targets.md).

Chaque phase produit un livrable concret validé par l'humain avant d'enchaîner. Les sous-agents Claude Code attachés à chaque phase vivent dans [`.claude/agents/`](./.claude/agents/).

## Phase 0 — Bootstrap

**Statut** : 🟢 en cours

- [x] Monorepo pnpm + Turborepo
- [x] Configs TS strict, ESLint 9 flat, Prettier 3, Vitest 2
- [x] Arborescence `packages/{schema,engine,blocks,functions}` + `apps/{api,runtime,editor}` (vides)
- [x] `ROADMAP.md`

**Critère de sortie** : `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` retournent vert sur le scaffold vide.

## Phase 1 — Analyse (`analyst`)

**Statut** : ⚪ à venir

Produire dans `docs/analysis/` :
- `g6k-model.md` — modèle de données G6K (Data, Steps, Field, Sources, Rules…).
- `expressions-grammar.md` — grammaire (opérateurs, fonctions, placeholders).
- `corpus-patterns.md` — fiche par simulateur du corpus + liste minimale des primitives.
- `guided-vs-expert.md` — frontière entre les deux modes.

**Critère de sortie** : les 4 documents sont validés et `corpus-patterns.md` cite les 11 types de champs, 10 opérateurs, 3 connecteurs, 3 familles d'actions de [`CLAUDE.md`](./CLAUDE.md) §7.

## Phase 2 — Schéma (`schema-architect`)

**Statut** : ⚪ à venir

- `packages/schema` — schéma Zod versionné (source de vérité unique).
- Génération JSON Schema (zod-to-json-schema).
- `packages/schema/examples/frais-locataire.json` + `taxeLogementsVacants.json` transcrits depuis les XML.
- `docs/schema.md` — chaque concept + exemple.

**Critère de sortie** : `safeParse` des 2 exemples passe sans erreur ; le JSON Schema est validé par `ajv`.

## Phase 3 — Moteur (`test-engineer` puis `engine-dev`)

**Statut** : ⚪ à venir

### Phase 3a — Golden tests

- `packages/engine/tests/fixtures/` — entrées + sorties attendues en JSON pour `frais-locataire` et `taxeLogementsVacants`.
- Couverture transversale : 10 opérateurs, 3 connecteurs, 3 familles d'actions, résolveurs mockés.

### Phase 3b — Engine

- Parser jsep → AST.
- Évaluateur d'expressions borné au registre `packages/functions` (PAS d'`eval()`).
- Évaluateur de règles (show/hide, set/unset, notify).
- Interfaces `DataSourceResolver` et `FunctionRegistry` injectées.

**Critère de sortie** : tous les golden tests passent SANS modification. Démo d'évaluation `frais-locataire` end-to-end côté serveur (script Node).

## Phase 4 — Blocs (`blocks-dev`)

**Statut** : ⚪ à venir

- `packages/blocks` — registre + interface `Block<TConfig>`.
- Blocs du corpus : champs typés (11), variant `range`, `text` à variables, `section`/`chapter` conditionnels, `accordion` à items conditionnels, `kpi-card`, `breakdown-table`, `notification`, `footnote`.
- `packages/blocks/README.md` — mécanisme d'ajout d'un bloc.

**Critère de sortie** : storybook (ou équivalent) rend chaque bloc avec une config exemple. Ajouter un bloc fictif est trivial.

## Phase 5 — API (`api-dev`)

**Statut** : ⚪ à venir

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
