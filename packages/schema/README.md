# @g6k4ever/schema

Schéma **Zod** versionné d'une définition de simulateur. **Source de vérité unique** du projet.

> 📌 Implémenté en **Phase 2**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`schema-architect`](../../.claude/agents/schema-architect.md).

## Périmètre

- Schéma Zod couvrant : métadonnées, étapes, champs (11 types), sources (`inline`/`database`/`api`), règles (conditions all/any/none + 10 opérateurs ; actions show/hide, set/unset, notify), blocs à variables, config de sortie.
- Génération JSON Schema (via `zod-to-json-schema`).
- Exemples canoniques transcrits depuis le corpus : `frais-locataire.json`, `taxeLogementsVacants.json`.
- Espace réservé pour `repeatableGroup` (post-MVP, prévu mais non implémenté).
