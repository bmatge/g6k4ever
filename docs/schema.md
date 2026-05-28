# `@g6k4ever/schema` — schéma d'une définition de simulateur

> Source de vérité unique du projet. Tout consommateur (engine, API, éditeur, runtime) part de ce schéma. Toute évolution incompatible incrémente `SCHEMA_VERSION` et prévoit sa migration (cf. [`CLAUDE.md`](../CLAUDE.md) §4 règle 6).

## Vue d'ensemble

Un **Simulator** est un document JSON validé par Zod. Sa structure :

```
Simulator
├── schemaVersion          (literal 1)
├── metadata               (slug, label, description, locale, dateFormat, authors)
├── outputKind             ("calcul" | "decision")
├── data[]                 (variables typées)
├── sources[]              (inline | database | api)
├── steps[]                (étapes ordonnées, chacune contient des blocs)
├── rules[]                (BusinessRules)
└── footnotes[]            (notes de bas de page)
```

Importer :

```ts
import { Simulator, type Simulator as TSimulator } from "@g6k4ever/schema";

const result = Simulator.safeParse(json);
if (result.success) {
  const sim: TSimulator = result.data;
  // ...
}
```

## Concepts

### Data — variables du simulateur

Une `Data` est une variable typée référencée par `#<id>` dans les expressions. Les 11 types autorisés (cf. [`CLAUDE.md`](../CLAUDE.md) §7) :

```
integer | number | money | percent | boolean | choice | text | textarea | date | month | year
```

Exemple :

```json
{
  "id": 1,
  "name": "commune",
  "label": "Code INSEE de la commune",
  "type": "text",
  "widget": "geoAPILocalities"
}
```

Une donnée peut être **saisie** (rien de plus), **calculée** (`content: "<expression>"`), ou **résolue par une source** (`source: { sourceId, returnPath }`).

### DataSource — d'où viennent les valeurs

Trois types :

- **`inline`** : table éditable en back-office, **figée à la publication** (cf. [`CLAUDE.md`](../CLAUDE.md) §4 règle 5).
- **`database`** : requête SQL **paramétrée** (jamais d'interpolation de fragment), pour le power user.
- **`api`** : connecteur HTTP avec cache TTL, géré par `@g6k4ever/api` — le moteur ne fait **jamais** d'appel HTTP.

Exemple d'une source SQL :

```json
{
  "kind": "database",
  "id": "zonage-commune",
  "label": "Zonage des communes",
  "connectionId": "g6k-zonage",
  "query": "SELECT commune, zone, frais FROM zonageCommunes WHERE codeInsee = %1$s",
  "parameters": [
    { "name": "insee", "type": "text", "position": 1, "bindToDataId": 1 }
  ],
  "columns": [
    { "name": "commune", "type": "text" },
    { "name": "zone", "type": "integer" },
    { "name": "frais", "type": "integer" }
  ]
}
```

### Condition / Connector — l'arbre de règles

Récursif :

```
ConditionExpr =
  | Condition (kind="condition", operand, operator, value?)
  | Connector (kind="connector", type="all"|"any"|"none", children: ConditionExpr[])
```

**Connecteurs** : `all` (ET), `any` (OU), `none` (≡ `!any(...)`, cf. [decisions.md](./analysis/decisions.md) D3).

**Opérateurs** (10) :

- **Unaires** : `present`, `blank`, `isTrue`, `isFalse` (pas de `value`)
- **Binaires** : `=`, `!=`, `<`, `<=`, `>`, `>=` (avec `value`)

Le schéma **valide** que les opérateurs unaires n'ont pas de `value` et que les binaires en ont une.

Exemple — règle « R4 : zone très tendue » de `frais-locataire` :

```json
{
  "kind": "connector",
  "type": "all",
  "children": [
    { "kind": "condition", "operand": 3, "operator": "present" },
    { "kind": "condition", "operand": 2, "operator": "present" },
    { "kind": "condition", "operand": 2, "operator": "=", "value": "2" }
  ]
}
```

### Action — ce que produit une règle

Quatre familles (cf. [`CLAUDE.md`](../CLAUDE.md) §7), implémentées comme une discriminated union :

| `kind` | Cible | Charge utile |
|---|---|---|
| `showObject` / `hideObject` | tout objet (step, panel, section, chapter, footnote, blockinfo, prenote, postnote, field, fieldset, action, data) | aucune |
| `setAttribute` | data (attribute = "content" par défaut) | `value` (expression) |
| `unsetAttribute` | data | aucune |
| `notifyError` / `notifyWarning` | data ou step | `message` (texte avec interpolation `#var`) |

### BusinessRule — la règle métier

```json
{
  "id": "R2",
  "name": "Affecte CodeInsee et nomCommune",
  "conditions": { "kind": "condition", "operand": 1, "operator": "present" },
  "ifActions": [
    {
      "kind": "setAttribute",
      "target": { "type": "data", "id": 5, "attribute": "content" },
      "value": "getInsee(#1)"
    }
  ],
  "elseActions": [
    { "kind": "unsetAttribute", "target": { "type": "data", "id": 5, "attribute": "content" } }
  ]
}
```

L'engine évalue les règles en **fixed-point convergence** : itération sur l'ensemble jusqu'à stabilisation, avec l'ordre XML comme tie-breaker (cf. [decisions.md](./analysis/decisions.md) D1).

### Block — élément d'interface

Enveloppe **générique** :

```json
{
  "id": "section-zone-1",
  "type": "text-section",
  "config": { "content": "..." }
}
```

Le schéma ne valide PAS le `config` ; c'est le registre `@g6k4ever/blocks` qui le fait à la consommation. Cela permet d'ajouter de nouveaux blocs sans toucher au schéma.

Types attendus pour le MVP : `field`, `text-section`, `chapter`, `accordion`, `kpi-card`, `breakdown-table`, `footnote`, `notification`, `reset-button`.

### Step — une étape (page)

Ordonnée, contient une liste de blocs.

```json
{
  "id": 1,
  "name": "zonage",
  "label": "Zonage",
  "blocks": [ /* ... */ ]
}
```

### Footnote — note de bas de page

```json
{ "id": "fn-1", "text": "Texte riche avec #var interpolé." }
```

Sa visibilité est pilotée par `showObject`/`hideObject` ciblant `type: "footnote"`.

## Validations transverses

Le `Simulator.safeParse(...)` applique :

1. Unicité des `id` de Data.
2. Unicité des `name` de Data.
3. Unicité des `id` de DataSource.
4. Unicité des `id` de Step.
5. Référence valide : toute `Data` avec `source.sourceId` désigne une source déclarée.
6. Opérateurs unaires (`present`, `blank`, `isTrue`, `isFalse`) : `value` absent.
7. Opérateurs binaires (`=`, `!=`, `<`, `<=`, `>`, `>=`) : `value` présent.
8. Toute `Condition` référence un `operand` qui correspond à une Data existante.
9. Toute Action ciblant `type: "data"` (avec id numérique) référence une Data existante.

## JSON Schema

```ts
import { toJsonSchema } from "@g6k4ever/schema";
const jsonSchema = toJsonSchema();
```

Génère un JSON Schema draft-07 utilisable par les éditeurs JSON (auto-complétion), les validateurs serveur (ajv), ou pour publier la spec hors du repo TypeScript.

## Exemples canoniques

Disponibles dans [`packages/schema/examples/`](../packages/schema/examples/) :

- [`frais-locataire.json`](../packages/schema/examples/frais-locataire.json) — arbre de décision, 1 step, 3 Data, 1 DataSource SQL, 4 BusinessRule.
- [`taxeLogementsVacants.json`](../packages/schema/examples/taxeLogementsVacants.json) — arbre de décision, 1 step, 7 Data, 2 DataSources SQL, 5 BusinessRule, usage de fonctions métier (`getInsee`, `getNomVille`).

Les deux exemples passent `Simulator.safeParse()` (cf. [`packages/schema/tests/examples.test.ts`](../packages/schema/tests/examples.test.ts)).

## Hors schéma

Ces concepts sont **prévus** mais **non implémentés** dans la v1 du schéma :

- **Groupe répétable** (`forfaits` G6K, `gratification-stagiaire`) → post-MVP, structure à acter avant ajout.
- **Primitive `chart`** (lignes/barres pour `poids-lourd`, `pompe-a-chaleur`) → v1.1.
- **Profils / Sites** (présents au XSD G6K mais absents du corpus) → hors périmètre.
- **Types `multichoice` / `table` / `department`** → hors périmètre (corpus ne les utilise pas).
- **`ChoiceGroup`, `Columns + FieldRow`** → mise en page laissée aux blocs DSFR.
