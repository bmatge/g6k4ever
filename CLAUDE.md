# CLAUDE.md — g6k4ever

## 1. Le projet en 3 lignes

Plateforme no-code de génération de simulateurs : back-office où des **contributeurs non-développeurs** créent et publient des simulateurs (calcul, arbre de décision) sans écrire de code, via un **mode guidé**. Une trappe **expert** (expressions, datasources SQL/API, templates) sert les power users. Les développeurs ajoutent des **blocs** et des **fonctions métier** (couche custom). Réécriture totale en TypeScript inspirée du périmètre fonctionnel de G6K. MVP = simulateur + arbre de décision.

## 2. Principe directeur

Chaque brique éditable a **deux vues d'une même donnée** : mode guidé (menus, sélecteurs) et mode expert (texte/expression). Le guidé est une **projection** de la représentation interne, jamais un système parallèle.

## 3. Stack

- **Langage** : TypeScript strict (toutes les couches)
- **Front** : React + `@codegouvfr/react-dsfr` (cf. [ADR-028](~/Documents/Obsidian/30-Knowledge/ADR/ADR-028-g6k4ever-no-code-typescript-dsfr.md), garde-fous §11)
- **Monorepo** : pnpm + Turborepo
- **Validation/schéma** : Zod (source de vérité) + génération JSON Schema
- **Expressions** : `jsep` (AST), évaluateur maison borné — **PAS d'`eval()`**
- **API** : Hono
- **Persistance** : SQLite au départ (accès isolé pour migration Postgres possible)
- **Tests** : Vitest (golden tests dérivés du corpus)
- **Déploiement** : VPS ; productions embarquables (bundle autonome + JSON, ou API distante)

## 4. Architecture (non négociable)

```
packages/
  schema/      → définition d'un simulateur = schéma Zod (source de vérité) + JSON Schema
  engine/      → TS PUR : parser d'expressions, évaluateur de règles, résolveurs injectés
  blocks/      → REGISTRE de blocs : 1 définition par bloc, consommée par runtime ET éditeur
  functions/   → registre des fonctions (standard + métier injectables)
apps/
  api/         → Hono. CRUD définitions, exécution, datasources (DB/api+cache), export
  runtime/     → React + DSFR. Rend une définition. Buildable en bundle autonome embeddable
  editor/      → React + DSFR. Back-office no-code (guidé⇄expert), preview live, lock, versions
```

### Règles non négociables

1. `engine` n'importe **jamais** React, le DOM, ni un client HTTP concret. Signature mentale : `(définition, entrées, résolveurs) → (état visible, variables, erreurs, sorties)`. Doit tourner côté serveur ET dans un bundle embarqué.
2. **Un bloc a une seule définition** dans `packages/blocks`, consommée à la fois par l'éditeur (pour le configurer) et le runtime (pour le rendre). Jamais deux fois.
3. Le **mode guidé produit la même représentation** que le mode expert. Le guidé est une vue d'édition de l'expression/règle, pas un moteur parallèle.
4. Datasources & fonctions sont **injectées** via une interface ; le moteur ne connaît que le contrat « résous cette clé » / « évalue cette fonction nommée ».
5. À la **publication**, chaque source locale est soit figée en instantané (les données partent dans le bundle), soit pointée vers l'API (seul le connecteur part).
6. **Schéma versionné** (`schemaVersion`) ; toute évolution prévoit la migration.

## 5. Comment lancer

```bash
# (stack à initialiser — phase 0 du plan)
pnpm install
pnpm dev          # lance api + editor + runtime en parallèle
pnpm test         # vitest, golden tests inclus
pnpm build        # build tous les packages + apps
```

## 6. Structure des dossiers

```
.
├── packages/                          → cœur réutilisable (schema, engine, blocks, functions)
├── apps/                              → applications (api, runtime, editor)
├── docs/                              → specs vivantes (analyse, schéma, périmètre)
├── _corpus/                           → simulateurs de référence (.xml G6K curés) — SPEC VIVANTE
├── G6K-code-legacy/                   → code G6K original (lecture seule, référence)
├── G6K-examples-data-legacy/          → données G6K originales (lecture seule, référence)
└── .claude/agents/                    → sous-agents Claude Code (analyst, engine-dev, …)
```

## 7. Périmètre fonctionnel autorisé (issu du corpus, NE PAS dépasser sans demander)

- **Champs** : `integer`, `number`, `money`, `percent`, `date`, `month`, `year`, `boolean`, `choice`, `text`, `textarea`.
- **Conditions** : connecteurs `all`/`any`/`none` imbriquables ; opérateurs `present`, `blank`, `=`, `!=`, `<`, `<=`, `>`, `>=`, `isTrue`, `isFalse`.
- **Actions** : `show/hide`, `set/unset` (affectation calculée), `notify error/warning` (validation, action de **première classe**).
- **Calculs** : arithmétique + fonctions du registre. **PAS de boucle/récursion** dans les expressions.
- **Datasources** : `inline` (éditable), `database` (SQL = expert), `api` (connecteur, cache).
- **Rendu** : assemblage de blocs DSFR + texte riche à variables (`#var`), conditionné par règles.
- **Groupe répétable** : **PRÉVU au schéma** mais **POST-MVP** (ne pas implémenter sans feu vert).

## 8. GARDE-FOU DE PÉRIMÈTRE (impératif)

Avant d'ajouter une capacité, une primitive, une dépendance lourde, ou une fonctionnalité non explicitement demandée, **VÉRIFIER qu'au moins un simulateur du corpus l'exige**. Si ce n'est pas le cas — ou en cas de doute sur le fait d'aller « trop loin » / de généraliser « au cas où » — **STOP : poser une question de cadrage à l'humain et attendre**. Ne jamais élargir le périmètre de sa propre initiative.

## 9. Corpus = critère d'acceptation

Les simulateurs de `_corpus/` (`frais-locataire`, `taxeLogementsVacants` en priorité) sont la **spec vivante**. Une fonctionnalité est « finie » quand un simulateur réel est reproductible à l'identique. Toute primitive du schéma doit être justifiée par un cas du corpus.

## 10. Règles de travail

- **Avant de coder** : produire ou mettre à jour les specs markdown dans `docs/`.
- **TDD sur l'engine** : golden tests dérivés du corpus **AVANT** implémentation. Ne jamais modifier un test pour le faire passer ; corriger le code.
- **Pas d'`eval()`** : expressions évaluées via AST (`jsep`) borné au registre.
- **Commits atomiques** + Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Demander validation humaine à chaque jalon (`ROADMAP.md`).
- **Concepts métier en français** (simulateur, étape, donnée, règle, source, fonction) ; code/API en anglais.

## 11. Garde-fous front-end (React + react-dsfr)

1. **Budget bundle runtime** : ≤ **120kB gzipped** pour `engine + runtime + blocs MVP`, hors DSFR (CSS+JS DSFR supposés déjà chargés par le portail hôte).
2. **Deux modes de build du runtime** : `embedded` (DSFR présent dans le host) vs `standalone` (ship DSFR).
3. **Définition de bloc unique** = composant React unique, consommé par éditeur et runtime. Pas de double implémentation.
4. **Porte de sortie Preact** : si le budget est dépassé sans solution propre en phase 6, basculer via alias Vite (react-dsfr compatible). Coût ~½ journée — choix tracé dans une nouvelle ADR.

## 12. Sous-agents Claude Code (cf. `.claude/agents/`)

`analyst` · `schema-architect` · `engine-dev` · `blocks-dev` · `api-dev` · `runtime-dev` · `editor-dev` · `test-engineer`.

Périmètre étroit par agent — voir le plan §5. Pas de mélange moteur/UI.

## 13. Ce que Claude doit toujours faire

- Vérifier qu'une primitive ajoutée est justifiée par le corpus (§8).
- Lancer les tests avant de considérer une tâche terminée (golden tests inclus).
- Mettre à jour ce `CLAUDE.md` si une convention change.
- Documenter toute décision structurante dans `~/Documents/Obsidian/30-Knowledge/ADR/`.
- Loguer la session dans `~/Documents/Obsidian/20-Sessions/YYYY-MM-DD.md` (ajouter `g6k4ever` à `projects:` du frontmatter).

## 14. Ce que Claude ne doit jamais faire

- Commit direct sur `main` sans autorisation.
- `git push --force` sans demander.
- Installer une lib non listée ici sans en parler.
- Toucher aux secrets / fichiers `.env*`.
- Modifier `G6K-code-legacy/` ou `G6K-examples-data-legacy/` (référence figée, lecture seule).
- Élargir le périmètre fonctionnel (§7) sans question préalable.
- Utiliser `eval()` ou équivalent (`new Function`, etc.) pour évaluer une expression.

## 15. Références

- Note projet dans le vault : `~/Documents/Obsidian/10-Projects/g6k4ever.md`
- ADR fondatrice : `~/Documents/Obsidian/30-Knowledge/ADR/ADR-028-g6k4ever-no-code-typescript-dsfr.md`
- Upstream historique G6K : https://github.com/eureka2/G6K
- Documentation G6K legacy : http://eureka2.github.io/g6k/documentation/en/learn-more.html
- DSFR : https://www.systeme-de-design.gouv.fr/
- react-dsfr : https://components.react-dsfr.codegouv.studio/
