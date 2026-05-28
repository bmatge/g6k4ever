# @g6k4ever/api

**API Hono + SQLite (better-sqlite3 + Drizzle ORM).** Persiste les définitions de simulateurs, gère les verrous d'édition, et expose `/run` pour évaluer une définition via `@g6k4ever/engine`.

> 📌 **Phase 5.2 livrée**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`api-dev`](../../.claude/agents/api-dev.md).

## Pile

- **HTTP** : [Hono](https://hono.dev) (rapide, typé, runtime-agnostique)
- **DB** : [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — driver SQLite synchrone, gère 100k-1M+ lignes sans transpirer
- **ORM** : [Drizzle](https://orm.drizzle.team) — API typée, migration trivial vers Postgres
- **Engine** : `@g6k4ever/engine` (zéro logique métier ici)
- **Functions** : `@g6k4ever/functions` (registre standard)

## Lancer en local

```bash
pnpm build                                          # build des packages amont
pnpm dev:api                                         # http://localhost:3000
# DB persistée par défaut à ./data/g6k4ever.db
# override via : G6K4EVER_DB_URL=/tmp/g6k.db PORT=3001 pnpm dev:api
```

À la 1re connexion, la DB se crée et les migrations s'appliquent (mode WAL,
foreign keys, busy_timeout 5s, cache 64 MB).

## Endpoints

### Stateless
| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Identité + liste des routes |
| GET | `/healthz` | Probe de santé |
| POST | `/run-stateless` | Body : `{simulator, input}` — évalue sans persistance |

### CRUD simulators
| Méthode | Route | Description |
|---|---|---|
| GET | `/simulators` | Liste résumée (triée par `updated_at` desc) |
| POST | `/simulators` | Crée un simulateur — body = définition Zod-validée |
| GET | `/simulators/:slug?version=draft\|published` | Récupère la version demandée |
| PUT | `/simulators/:slug` | Met à jour le brouillon (lock requis si détenu) |
| DELETE | `/simulators/:slug` | Supprime |
| POST | `/simulators/:slug/publish` | Promeut le brouillon en version publiée |

### Lock d'édition
| Méthode | Route | Description |
|---|---|---|
| POST | `/simulators/:slug/lock?force=true` | Acquiert le verrou (TTL 15 min) |
| POST | `/simulators/:slug/lock/heartbeat` | Renouvelle le TTL |
| DELETE | `/simulators/:slug/lock?force=true` | Libère le verrou |

Tous les endpoints mutables exigent l'en-tête `X-User-Id` (placeholder pour
l'auth future, sera remplacé par JWT/session).

### Évaluation
| Méthode | Route | Description |
|---|---|---|
| POST | `/simulators/:slug/run?version=draft\|published` | Body : `{input}` — évalue la définition stockée |

## Datasources externes — abstraction branchable

Le `MultiDataSourceResolver` dispatche selon `sourceDef.kind` :

- `inline` → lit `rows` de la définition (toujours dispo).
- `database` → délègue à un `DatabaseConnectionProvider` enregistré sous `connectionId`.
- `api` → délègue à un `ApiConnectionProvider` enregistré sous l'id de la source.

Pour brancher un provider à l'amorçage :

```ts
import { createApp, emptyProviderRegistry, MockDatabaseProvider } from "@g6k4ever/api";

const providers = emptyProviderRegistry();
const mockDb = new MockDatabaseProvider().setData(rows, (row, params) =>
  row.codeInsee === params.codeInsee
);
providers.databases.set("g6k-tlv", mockDb);

const { app } = createApp({ providers });
```

**Pour Phase 5.3 (post-MVP)** : remplacer `MockDatabaseProvider` par un vrai
provider (ex. pool `pg`, `mysql2`, ou SQLite distant) et `MockApiProvider` par
un client HTTP avec cache TTL (ex. `undici` + cache LRU). L'interface est
stable, **le reste du code ne bouge pas**.

## Configuration

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port HTTP |
| `G6K4EVER_DB_URL` | `./data/g6k4ever.db` | Chemin SQLite (`:memory:` pour RAM) |

## Démonstration end-to-end

```bash
# Probe
curl http://localhost:3000/healthz
# → {"status":"ok"}

# Créer un simulateur trivial (y = x * 2)
curl -X POST http://localhost:3000/simulators \
  -H "Content-Type: application/json" \
  -H "X-User-Id: alice" \
  -d '{
    "schemaVersion": 1,
    "metadata": { "name": "demo", "label": "Demo", "defaultLocale": "fr-FR", "dateFormat": "dd/MM/yyyy", "authors": [] },
    "outputKind": "calcul",
    "data": [
      { "id": 1, "name": "x", "label": "X", "type": "integer" },
      { "id": 2, "name": "y", "label": "Y", "type": "integer", "content": "#1 * 2" }
    ],
    "sources": [], "steps": [{ "id": 1, "name": "s", "label": "S", "blocks": [] }],
    "rules": [], "footnotes": []
  }'
# → { "simulator": { ..., "slug": "demo", "hasPublished": false } }

# Évaluer
curl -X POST http://localhost:3000/simulators/demo/run \
  -H "Content-Type: application/json" \
  -d '{ "input": { "x": 21 } }'
# → { "state": { "values": { "1": 21, "2": 42 }, "stable": true, "iterations": 2 }, "version": "draft" }

# Lock / Edit flow
curl -X POST http://localhost:3000/simulators/demo/lock -H "X-User-Id: alice"
curl -X PUT  http://localhost:3000/simulators/demo -H "X-User-Id: alice" -H "Content-Type: application/json" -d '<définition mise à jour>'
curl -X POST http://localhost:3000/simulators/demo/publish -H "X-User-Id: alice"
curl -X DELETE http://localhost:3000/simulators/demo/lock -H "X-User-Id: alice"
```

## À venir (Phase 5.3+)

- Vrais providers `database` (Postgres pool, MySQL) et `api` (HTTP + cache LRU).
- Versions historisées (au-delà de draft/published).
- Export d'une production embarquable (JSON figé ou pointeur API).
- OpenAPI auto-généré via `@hono/zod-openapi`.
- Auth réelle (JWT ou session) en remplacement de `X-User-Id`.
- Job de purge des verrous expirés (actuellement cleanup paresseux à l'acquisition).

## Règle non négociable

**Zéro logique métier dans l'API.** Toute évaluation passe par
`@g6k4ever/engine` (cf. [`CLAUDE.md`](../../CLAUDE.md) §4 règle 1).
