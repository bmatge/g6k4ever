# Protocole de session Ecosysteme v2

---

## QUICK REFERENCE

```bash
# Commandes essentielles
npm test                    # Lancer tous les tests
npm run typecheck           # Vérifier les types TypeScript
npm run build               # Build local
docker compose build        # Build Docker (plus strict)

# URLs développement
http://localhost:3000/api/docs     # Swagger UI
http://localhost:5173              # Frontend Vite
http://localhost:3000/api/health   # Health check
```

| Fichier clé | Description |
|-------------|-------------|
| `documentation/ai/BOOTSTRAP.md` | Contexte projet complet |
| `documentation/ai/LESSONS-LEARNED.md` | Erreurs à éviter |
| `documentation/dev/apps/API.md` | Standards API |
| `apps/web/src/components/common/README.md` | Composants UI |
| `apps/web/src/config/paths.ts` | **Source unique URLs** |
| `apps/web/src/config/navigation.ts` | Arborescence navigation |

---

## DEBUT DE SESSION

Lis ces fichiers :
1. **documentation/ai/BOOTSTRAP.md** - Contexte projet
2. **documentation/INDEX.md** - Index de la documentation

Puis continue les taches ci-dessus.

---

## EN COURS DE DEVELOPPEMENT

En plus de la documentation, il existe un POC de cette application (une V1 fonctionnelle mais pas optimale en terme d'architecure logicielle et de qualité de code)

Si tu as besoin de la consulter elle est disponible sur https://github.com/bmatge/ecosysteme et dans /Users/bertrand/Documents/GitHub/ecosysteme (en local sur MacbookAir)

---

## EPICS TERMINÉS RÉCEMMENT

### Navigation Centralisée ✅

**Roadmap** : `roadmap/done/EPIC-NAVIGATION-CENTRALISEE.md`

- `apps/web/src/config/paths.ts` - Source unique de vérité pour tous les chemins
- `apps/web/src/config/navigation.ts` - Arborescence complète + metadata (icons, rôles, breadcrumb)
- `apps/web/src/components/common/Breadcrumb.tsx` - Composant fil d'ariane auto-calculé
- `apps/web/src/components/common/HubPage.tsx` - Composant page intermédiaire avec tuiles
- MainLayout dynamique généré depuis navigation.ts
- Migration des liens hardcodés vers `PATHS.*`

### Command Palette & Aide Contextuelle ✅

**Roadmap** : `roadmap/done/EPIC-COMMAND-PALETTE-HELP.md`

- Command Palette (`Cmd+K`) avec ~45 commandes navigation
- Mode Aide Utilisateur (`?`) avec overlay et popovers
- Mode Éditeur Visuel (`Cmd+Shift+H`) pour admins
- Interface admin `/admin/help` pour gérer le contenu
- Module backend `help-content`

**Finitions optionnelles** : Seed contenu aide initial, tests E2E, documentation utilisateur

### MCP Server ✅

**Roadmap** : `roadmap/done/EPIC-MCP-SERVER.md`

- Serveur MCP pour assistants IA (`apps/mcp/`)
- Endpoints : sites, organisations, scans, alerts
- Gestion tokens MCP (`/profile/mcp-tokens`, `/admin/users/:id/mcp-tokens`)
- Rate limiting spécifique MCP

### Internal Workers / Jupyter ✅

- Support `network_type` sur sites (public/internal)
- Bookmarklet scanner pour scans DOM-based
- Intégration Jupyter pour exécuter scans sur réseaux internes
- UI d'assignation workers internes sur sites

### Audit de sécurité ✅

**Roadmap** : `roadmap/done/EPIC-SECURITY-AUDIT.md`

- VULN-001 et VULN-002 corrigés
- Rapport : `roadmap/RAPPORT-AUDIT-2026-01-15.md`

---

## DOCKER

Le projet dispose d'une configuration Docker complète :

Voir `documentation/ops/DOCKER.md` et `documentation/ops/DEPLOYMENT.md` pour plus de détails.

---

## EXIGENCE CRITIQUE : TESTS OBLIGATOIRES

> **Voir TEST-003 dans `documentation/ai/LESSONS-LEARNED.md`** - Cette erreur a été commise et ne doit JAMAIS se reproduire.

### Règle absolue

**Une feature n'est PAS terminée sans ses tests.**

### Workflow obligatoire

1. **Setup tests EN PREMIER** - Avant d'écrire du code applicatif, vérifier que l'infrastructure de tests existe
2. **Todo systématique** - Chaque feature doit avoir un todo "tests" associé :
   ```
   ☐ Implémenter SiteListPage
   ☐ Tests SiteListPage        ← OBLIGATOIRE
   ```
3. **Definition of Done** - Ne JAMAIS marquer une feature comme terminée sans tests

### Par type de code

| Code | Framework de test | Minimum requis |
|------|------------------|----------------|
| Backend API (`apps/api/`) | Vitest | Tests unitaires + intégration endpoints |
| Worker (`apps/worker/`) | Vitest | Tests unitaires jobs |
| Modules (`packages/modules/*`) | Vitest | Tests unitaires services |
| Frontend (`apps/web/`) | Vitest + React Testing Library | Tests composants |
| E2E | Playwright | Flows critiques (login, CRUD) |

### Checklist avant de dire "c'est terminé"

```
□ Infrastructure de tests existe pour ce package/app
□ Tests unitaires écrits pour la nouvelle fonctionnalité
□ Tests d'intégration si API/DB impliquée
□ Tests E2E si flow utilisateur critique
□ npm test passe sans erreur
□ Couverture ne baisse pas
```

---

## EXIGENCES DÉVELOPPEMENT FRONTEND

**OBLIGATOIRE** lors de tout travail sur le frontend (`apps/web/`) :

### Stack technique

- **Framework** : React + Vite + TypeScript
- **Design System** : `@codegouvfr/react-dsfr` (DSFR officiel)
- **Routing** : React Router v6
- **State** : React Query (TanStack Query) pour les données API

### Conventions react-dsfr

```typescript
// Import des composants
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { fr } from '@codegouvfr/react-dsfr';

// Classes CSS DSFR
<div className={fr.cx('fr-container', 'fr-py-4w')}>
  <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
    ...
  </div>
</div>
```

### IMPORTANT : Navigation avec DSFR (TS-002)

> **Voir TS-002 dans `documentation/ai/LESSONS-LEARNED.md`**

Bien que `startReactDsfr({ Link })` soit configuré dans `main.tsx`, tous les composants DSFR n'utilisent pas cette intégration de la même façon :

**Header/Footer** (via MainLayout.tsx) : utilisent un helper avec `to` + cast de type
```typescript
// MainLayout.tsx - helper spécifique pour Header/Footer
const linkProps = (to: string) => ({ to }) as unknown as { href: string };
<Header navigation={[{ text: 'Sites', linkProps: linkProps('/sites') }]} />
```

**Tile, Button, Card, etc.** : utilisent `href` directement (pas d'intégration React Router)
```typescript
// ❌ INCORRECT - provoque erreur TypeScript
<Tile linkProps={{ to: '/admin/settings' }} />
<Button linkProps={{ to: '/path' }}>Retour</Button>

// ✅ CORRECT - pour liens simples
<Tile linkProps={{ href: '/admin/settings' }} />

// ✅ CORRECT - pour navigation programmatique avec Button
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
<Button onClick={() => navigate('/admin/settings')}>Retour</Button>
```

### Composants UI reutilisables

Bibliotheque de composants custom dans `apps/web/src/components/common/` (voir README.md pour details) :

| Composant | Usage | Import |
|-----------|-------|--------|
| **FilterBar** | Barre de filtres configurable (text, select, searchable) | `@/components/common/FilterBar` |
| **Pagination** | Pagination simple ou complete | `@/components/common/Pagination` |
| **StatusBadge** | Badge avec config centralisee | `@/components/common/StatusBadge` |
| **EmptyState** | Etat vide avec action | `@/components/common/EmptyState` |
| **ListPageHeader** | En-tete de page liste | `@/components/common/ListPageHeader` |
| **StatCard** | Carte de statistique | `@/components/common/StatCard` |
| **TableActionButtons** | Boutons d'action tableau | `@/components/common/TableActionButtons` |
| **SearchableSelect** | Selection avec recherche async | `@/components/common/SearchableSelect` |
| **SortableTable** | Table avec tri client-side | `@/components/common/SortableTable` |
| **Breadcrumb** | Fil d'ariane auto-calculé depuis navigation.ts | `@/components/common/Breadcrumb` |
| **HubPage** | Page intermédiaire avec tuiles (utilise navigation.ts) | `@/components/common/HubPage` |
| **ConfirmModal** | Modal de confirmation DSFR (remplace window.confirm) | `@/components/common/ConfirmModal` |

**Composants Command Palette & Aide** dans `apps/web/src/components/command/` et `components/help/` :

| Composant | Usage | Import |
|-----------|-------|--------|
| **CommandPalette** | Palette de commandes (Cmd+K) | `@/components/command/CommandPalette` |
| **HelpProvider** | Context global mode aide | `@/components/help/HelpProvider` |
| **HelpTarget** | Wrapper éléments avec aide contextuelle | `@/components/help/HelpTarget` |
| **HelpEditorOverlay** | Mode éditeur visuel (admins) | `@/components/help/HelpEditorOverlay` |

**Composants KPI** dans `apps/web/src/components/kpis/` :

| Composant | Usage | Import |
|-----------|-------|--------|
| **KpiCard** | Affichage score/valeur avec barre de progression | `@/components/kpis/KpiCard` |
| **KpiSourceBadge** | Badge source (scanner/manual/indicator) | `@/components/kpis/KpiSourceBadge` |
| **KpiConflictBadge** | Indicateur de conflit KPI | `@/components/kpis/KpiConflictBadge` |
| **SiteKpiPanel** | Panel groupant tous les KPIs d'un site | `@/components/kpis/SiteKpiPanel` |
| **KpiEditModal** | Modal d'edition des valeurs manuelles | `@/components/kpis/KpiEditModal` |

> Pages KPI : `pages/pilotage/KpiDashboardPage.tsx` et `KpiConflictsPage.tsx`
> API client : `api/kpis.ts` avec React Query hooks

```typescript
// Exemple typique d'une page liste
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/common/FilterBar';
import { Pagination } from '@/components/common/Pagination';
import { StatusBadge, SITE_STATUS } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ListPageHeader } from '@/components/common/ListPageHeader';
import { SortableTable } from '@/components/common/SortableTable';

// En-tete
<ListPageHeader title="Sites" action={{ label: "Nouveau", to: "/sites/new" }} />

// Filtres
<FilterBar filters={filterConfig} values={values} onChange={setValues} onSubmit={search} />

// Contenu
{data.length === 0 ? (
  <EmptyState title="Aucun site" hasFilters={hasFilters} />
) : (
  <>
    <SortableTable data={data} columns={columns} getRowKey={(s) => s.id} />
    <Pagination page={page} totalPages={totalPages} onChange={setPage} variant="simple" />
  </>
)}
```

> Voir `apps/web/src/components/common/README.md` pour la documentation complete.
> Reference : `pages/sites/SiteListPage.tsx` comme modele de page liste.

### Navigation centralisée

> **Voir** `apps/web/src/config/paths.ts` et `apps/web/src/config/navigation.ts`

**Utiliser `PATHS.*` pour tous les liens** :

```typescript
import { PATHS } from '@/config/paths';

// ✅ CORRECT - Utiliser PATHS
<Link to={PATHS.sites}>Sites</Link>
navigate(PATHS.siteDetail(site.id))

// ❌ INCORRECT - Liens hardcodés
<Link to="/sites">Sites</Link>
navigate(`/sites/${site.id}`)
```

**Breadcrumb automatique** :

```typescript
import { Breadcrumb } from '@/components/common/Breadcrumb';

// Calcule automatiquement le fil d'ariane depuis l'URL
<Breadcrumb />

// Avec éléments supplémentaires (pour pages dynamiques)
<Breadcrumb extra={[{ label: site.name }]} />
```

**Pages Hub** :

```typescript
import { HubPage } from '@/components/common/HubPage';

// Génère automatiquement les tuiles depuis navigation.ts
<HubPage hubId="domaines" />
```

### Règles strictes

```
□ TOUJOURS utiliser les composants react-dsfr (pas de composants custom sauf nécessité)
□ TOUJOURS utiliser les composants custom existants (SearchableSelect, SortableTable)
□ TOUJOURS utiliser fr.cx() pour les classes CSS DSFR
□ TOUJOURS utiliser PATHS.* pour les liens (pas de hardcodé)
□ JAMAIS de CSS custom pour ce qui existe dans DSFR
□ JAMAIS de couleurs hardcodées (utiliser les variables CSS DSFR)
□ TOUJOURS respecter l'accessibilité RGAA
```

### Documentation

- Composants : https://components.react-dsfr.codegouv.studio/
- Guide : https://react-dsfr.codegouv.studio/
- Voir `documentation/dev/apps/WEB.md` pour les conventions projet

---

## EXIGENCES DÉVELOPPEMENT API

**OBLIGATOIRE** lors de tout travail sur l'API (`apps/api/`) :

### Réflexe CRUD + Filtre Organisation

**Avant de créer ou modifier une route API, vérifier :**

| Vérification | Description |
|--------------|-------------|
| **CRUD complet** | GET list, GET :id, POST, PUT/PATCH, DELETE |
| **Filtre organisationId** | Support du query param `?organisationId=xxx` sur les listes |
| **Filtre siteId** | Pour entités liées aux sites (domains, scans, alerts, certificates) |
| **Cohérence** | Même pattern que les autres routes existantes |

**Routes principales et leur statut actuel :**

| Entité | CRUD | Filtre Org | Notes |
|--------|------|------------|-------|
| Sites | ✅ | ✅ `organisationId` | Référence |
| Domains | ✅ | ✅ `organisationId` | + filtre siteId |
| Organisations | ✅ | N/A | Hiérarchique (tree, roots, children) |
| Responsables | ✅ | ✅ `organisationId` | + assign-to-organisation |
| Categories | ✅ | ❌ Manquant | À ajouter si besoin métier |
| Scans | ⚠️ R-only | via `siteId` | Launch + list uniquement |
| Alerts | ⚠️ Partiel | via `siteId` | Pas de DELETE |
| Users | ✅ | ❌ | Scope global (normal) |

**Checklist nouvelle route :**

```
□ CRUD complet implémenté (ou justification si partiel)
□ Filtre organisationId ajouté si entité liée aux orgs
□ Filtre siteId ajouté si entité liée aux sites
□ Documentation Swagger à jour
□ Tests endpoints écrits
```

### Documentation Swagger

Tout nouvel endpoint DOIT être documenté avec des annotations OpenAPI (swagger-jsdoc) :

```typescript
/**
 * @openapi
 * /resource:
 *   get:
 *     tags: [Resource]
 *     summary: Description courte
 *     description: Description détaillée
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 */
router.get('/', handler);
```

Voir `documentation/dev/apps/API.md` section "Documentation Swagger" pour :
- Format complet des annotations
- Composants réutilisables
- Tags disponibles
- Checklist de documentation

### Accès documentation

```
Swagger UI : http://localhost:3000/api/docs
OpenAPI JSON : http://localhost:3000/api/docs.json
```

---

## EXIGENCE CRITIQUE : BUILD DOCKER PROPRE

> **Voir BUILD-001 dans `documentation/ai/LESSONS-LEARNED.md`** - Cette erreur a été commise et ne doit JAMAIS se reproduire.

### Règle absolue

**Un nouveau module ou une nouvelle dépendance DOIT être déclaré partout.**

### Checklist nouveau module (`packages/modules/nouveau-module/`)

```
□ package.json créé avec le bon nom (@ecosysteme/module-xxx)
□ Dépendance ajoutée dans les consumers (apps/worker, apps/api)
□ Module ajouté dans Dockerfile (section 2a ou 2b selon dépendances)
□ Export ajouté dans le module index.ts
□ Tests créés et passent
```

### Dockerfile - Ordre de build

Le fichier `Dockerfile` définit l'ordre de compilation. **Si un module n'est pas listé, le build Docker échouera.**

```dockerfile
# Dockerfile - Section modules (lignes ~75-96)

# 2a. Modules SANS dépendances inter-modules
RUN pnpm --filter @ecosysteme/module-mail \
    --filter @ecosysteme/module-xxx \  # ← AJOUTER ICI si pas de deps
    ... build

# 2b. Modules AVEC dépendances sur d'autres modules
RUN pnpm --filter @ecosysteme/module-users \
    --filter @ecosysteme/module-yyy \  # ← AJOUTER ICI si deps
    ... build
```

### Checklist nouvelle dépendance

```
□ Dépendance ajoutée dans package.json du consumer
□ pnpm install exécuté
□ Si workspace dependency: vérifier que le module source est buildé AVANT
□ Import vérifié (pas d'erreur TypeScript)
```

### Vérification avant commit

```bash
# Build local complet
pnpm build

# Build Docker (plus strict)
docker compose build
```

### Erreur typique à éviter

```
error TS2307: Cannot find module '@ecosysteme/module-xxx'
```

**Cause** : Le module n'est pas dans la liste de build du Dockerfile.
**Solution** : Ajouter `--filter @ecosysteme/module-xxx` dans la section appropriée.

---

## FIN DE SESSION - MISE À JOUR DOCUMENTATION

**OBLIGATOIRE** : Avant de terminer une session de travail, tu DOIS :

### 1. Mettre à jour les fichiers existants (NE PAS CRÉER de nouveaux fichiers)

| Ce qui a changé | Fichier à MODIFIER |
|-----------------|-------------------|
| Nouvelle erreur/bug corrigé | `documentation/ai/LESSONS-LEARNED.md` |
| Nouveau composant Core | `documentation/dev/ARCHITECTURE.md` |
| Nouvelle entité/type | `documentation/dev/DATA-SCHEMA.md` |
| Nouvel endpoint API | `documentation/dev/apps/API.md` |
| Nouvel événement | `documentation/dev/EVENTS.md` |
| Décision architecture majeure | Créer `documentation/adr/ADR-XXX-*.md` (seul cas de création) |

### 2. Règles strictes

```
□ MODIFIER les fichiers existants, NE PAS en créer de nouveaux
□ SUPPRIMER les sections obsolètes plutôt que les commenter
□ METTRE À JOUR les exemples de code si l'implémentation a changé
```

### 3. Checklist fin de session

Avant de dire "c'est terminé", vérifie :

```
□ Le code fonctionne (tests passent)
□ La doc reflète l'état ACTUEL du code
□ Pas de TODO/FIXME laissés sans issue
□ LESSONS-LEARNED mis à jour si erreur rencontrée
```

### 4. Anti-patterns à éviter ABSOLUMENT

```
❌ Créer un nouveau fichier quand on peut modifier l'existant
❌ Laisser de la doc obsolète "au cas où"
❌ Empiler des versions (ROUTES-v2.md, ROUTES-new.md)
❌ Documenter ce qu'on va faire plutôt que ce qui existe
❌ Créer des fichiers de notes temporaires
```

### 5. Format de mise à jour

Quand tu modifies un fichier de doc :
- Si suppression de contenu obsolète, pas besoin de garder l'historique
- Un fichier = une source de vérité unique

---

## RAPPEL : La documentation doit toujours refléter l'état ACTUEL du code, pas son historique ni ses intentions futures.
