# g6k4ever

> Plateforme **no-code** de génération de simulateurs (calcul, arbre de décision) — réécriture **TypeScript** inspirée du périmètre fonctionnel de [**G6K**](https://github.com/eureka2/G6K) (le moteur de simulateurs PHP/Symfony d'eureka2, utilisé dans l'administration française).

Des **contributeurs non-développeurs** créent et publient des simulateurs sans écrire de code via un **mode guidé** (menus, sélecteurs) ; une trappe **expert** (expressions, datasources SQL/API, templates) sert les power users ; les développeurs étendent la plateforme par des **blocs** et des **fonctions métier**.

**Principe directeur** : chaque brique éditable a deux vues d'une même donnée — le mode guidé est une *projection* de la représentation interne, jamais un système parallèle.

## Stack

- **TypeScript strict** sur toutes les couches · monorepo **pnpm + Turborepo**
- **Schéma** : Zod (source de vérité) → génération JSON Schema, versionné (`schemaVersion`)
- **Expressions** : `jsep` (AST) + évaluateur maison borné — **jamais d'`eval()`**
- **Front** : React + [`@codegouvfr/react-dsfr`](https://github.com/codegouvfr/react-dsfr) · **API** : Hono · **Persistance** : SQLite (migration Postgres possible)
- **Tests** : Vitest (golden tests dérivés du corpus) + Playwright (E2E)

## Architecture

```
packages/
  schema/      définition d'un simulateur = schéma Zod (source de vérité) + JSON Schema
  engine/      TS PUR : parser d'expressions, évaluateur de règles, résolveurs injectés
  blocks/      registre de blocs DSFR — 1 définition par bloc (runtime ET éditeur)
  functions/   registre des fonctions (standard + métier injectables)
apps/
  api/         Hono — CRUD définitions, exécution, datasources, lock, versions, export
  runtime/     React + DSFR — rend une définition ; buildable en bundle autonome embeddable
  editor/      React + DSFR — back-office no-code (guidé ⇄ expert), preview live  ← le produit
```

**Règle non négociable** : `engine` n'importe jamais React, le DOM ni un client HTTP — signature mentale `(définition, entrées, résolveurs) → (état, variables, erreurs, sorties)`, exécutable côté serveur comme dans un bundle embarqué.

## Développement

```bash
pnpm install
pnpm dev          # tous les apps en dev
pnpm test         # Vitest
pnpm test:e2e     # Playwright
pnpm typecheck && pnpm lint
```

## Corpus & avancement

`_corpus/` **est la spec vivante** : toute primitive doit être justifiée par un simulateur réel (5 simulateurs G6K en XML + 5 simulateurs du portail-élec en HTML/JS). Une feature est *finie* quand un simulateur du corpus est reproductible à l'identique. Voir [`ROADMAP.md`](./ROADMAP.md) pour l'état des phases et [`docs/schema.md`](./docs/schema.md) pour le modèle de données.
