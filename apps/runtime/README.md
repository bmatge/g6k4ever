# @g6k4ever/runtime

**Runtime React + `@codegouvfr/react-dsfr`.** Prend une définition de simulateur, appelle l'engine, rend les blocs visibles.

> 📌 Implémenté en **Phase 6**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`runtime-dev`](../../.claude/agents/runtime-dev.md).

## Deux modes de build

- `embedded` — DSFR (CSS+JS) supposé déjà chargé par le portail hôte. Bundle minimal.
- `standalone` — ship DSFR avec, pour un déploiement autonome.

## Budget bundle

≤ **120kB gzipped** pour `engine + runtime + blocs MVP` hors DSFR (cf. [`CLAUDE.md`](../../CLAUDE.md) §11). Vérifié à chaque build. **Porte de sortie Preact** prévue si dépassement.

## Règle

**Aucun calcul recodé.** Tout passe par `@g6k4ever/engine`.
