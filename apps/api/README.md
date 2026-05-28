# @g6k4ever/api

**API Hono + (futur) SQLite.** Pour l'instant : **endpoint stateless** qui évalue un simulateur sans persistance. La couche persistance (CRUD, lock, versions, export) viendra en Phase 5.2 — décisions DB en attente.

> 📌 **Phase 5a (en cours)**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`api-dev`](../../.claude/agents/api-dev.md).

## Lancer en local

```bash
# Build des packages amont (schema/engine/functions)
pnpm build

# Démarrer le serveur en watch
pnpm --filter @g6k4ever/api dev
# Sortie : [@g6k4ever/api] up on http://localhost:3000
```

## Tester

```bash
# Probe de santé
curl http://localhost:3000/healthz

# Évaluation stateless — body : { simulator: Simulator, input: Record<dataName, value> }
curl -X POST http://localhost:3000/run-stateless \
  -H "Content-Type: application/json" \
  -d '{
    "simulator": {
      "schemaVersion": 1,
      "metadata": { "name": "demo", "label": "Demo", "defaultLocale": "fr-FR", "dateFormat": "dd/MM/yyyy", "authors": [] },
      "outputKind": "decision",
      "data": [
        { "id": 1, "name": "x", "label": "X", "type": "integer" },
        { "id": 2, "name": "y", "label": "Y", "type": "integer", "content": "#1 * 2" }
      ],
      "sources": [],
      "steps": [{ "id": 1, "name": "s1", "label": "Step 1", "blocks": [] }],
      "rules": [],
      "footnotes": []
    },
    "input": { "x": 21 }
  }'
# → { "state": { "values": { "1": 21, "2": 42 }, "visibility": {}, "notifications": [], "stable": true, "iterations": 2 } }
```

Pour un cas plus réaliste (avec datasource inline), voir
[`apps/api/tests/run-stateless.test.ts`](./tests/run-stateless.test.ts) — il
contient un simulateur de test avec source `inline` et paramètre lié à une Data.

## Endpoints (Phase 5a)

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Identité de l'API |
| GET | `/healthz` | Probe de santé |
| POST | `/run-stateless` | Évalue un simulateur sans persistance |

## À venir (Phase 5.2)

- Driver DB : à arrêter (SQLite brut / Drizzle / Prisma).
- CRUD `/simulators` (create, list, get, update, delete).
- Lock d'édition (`X-User-Id` + timeout).
- Versions brouillon/publié + endpoint `/publish`.
- Datasources `database` (pool de connexions externes) et `api` (proxy + cache TTL).
- Export d'une production embarquable (JSON figé ou pointeur API).
- OpenAPI auto-généré via `@hono/zod-openapi`.

## Règle non négociable

**Zéro logique métier dans l'API.** Toute évaluation passe par `@g6k4ever/engine` (cf. [`CLAUDE.md`](../../CLAUDE.md) §4 règle 1).
