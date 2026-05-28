# @g6k4ever/api

**API Hono + SQLite.** CRUD définitions, exécution (via `@g6k4ever/engine`), datasources, lock d'édition, versions brouillon/publié, export d'une production.

> 📌 Implémenté en **Phase 5**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`api-dev`](../../.claude/agents/api-dev.md).

## Règle

**Zéro logique métier.** Toute évaluation passe par `@g6k4ever/engine`. La couche API gère le transport, la persistance, le lock et les versions — rien d'autre.

Accès DB **isolé dans un module** pour permettre une migration ultérieure SQLite → Postgres sans toucher au reste.
