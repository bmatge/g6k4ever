# Modèle de données G6K (reverse-engineering)

> Document de référence pour la phase 2 (`schema-architect`). Décrit la structure de `Simulator.xsd` et son utilisation effective dans les 5 simulateurs du corpus. Tout ce qui n'est pas observé dans le corpus est explicitement signalé.

## 1. Vue d'ensemble

Un simulateur G6K est un fichier XML `<Simulator>` validé par `Simulator.xsd`. Il contient quatre piliers fonctionnels :

1. **`DataSet`** — les variables (saisies, calculées, issues de sources).
2. **`Steps`** — la mise en page et le contenu visible (`Panels` ⊃ `FieldSet`/`BlockInfo`).
3. **`Sources`** — les datasources (SQL/API/inline).
4. **`BusinessRules`** — la logique réactive (`Conditions` → `IfActions`/`ElseActions`).

Trois éléments secondaires :
- **`Description`** (RichText d'intro), **`Profiles`** (jeux de valeurs par défaut — **jamais utilisés dans le corpus**), **`RelatedInformations`** (RichText de bas de page), **`Sites`** (pointeurs externes — **non utilisés**).

## 2. Hiérarchie complète

```
Simulator(name, label, locale="fr-FR", defaultView, referer, dynamic, …)
├── Description : RichText (HTML CDATA)
├── DataSet(dateFormat, decimalPoint, moneySymbol, symbolPosition, …)
│   ├── Data*            ← variables atomiques
│   └── DataGroup*       ← regroupement (cf. §4.2)
│       └── Data+
├── Profiles?            ← {Profile.name, Profile.label, [Data ⊃ default]}  (hors MVP)
├── Steps
│   └── Step*(id, name, label, template, output, dynamic)
│       ├── Description : RichText
│       ├── Panels
│       │   └── Panel*(id, name, label)
│       │       └── (FieldSet | BlockInfo)+   ← choix répétable
│       │           ├── FieldSet(id, disposition?, display?)
│       │           │   ├── Legend : RichText
│       │           │   └── Field+ | (Columns + FieldRow+)   ← grille rare
│       │           └── BlockInfo(id, name, display?)
│       │               └── Chapter+(id, name, icon?, collapsible?)
│       │                   └── Section+(id, name, role?)
│       │                       ├── Content : RichText (#var)
│       │                       └── Annotations : RichText
│       ├── ActionList?
│       │   └── Action*(name, what, for, label, …)   ← boutons (submit/reset/newSimulation)
│       └── FootNotes?(position)
│           └── FootNote*(id) : RichText
├── Sources?
│   └── Source*(id, datasource, request, returnType, returnPath, requestType?)
│       └── Parameter*(name, type, origin, data | constant, format?)
├── BusinessRules?
│   └── BusinessRule*(id, name, label, attributactive)
│       ├── Conditions(value="…expression textuelle…")
│       │   └── (Condition | Connector)?      ← AST imbriqué (§5)
│       ├── IfActions / ElseActions
│       │   └── Action*(name, target, …cibles…, value?)
└── RelatedInformations? : RichText
```

## 3. Le `Data` (la variable, primitive centrale)

Attributs (extrait de `DataType`) :

| Attribut | Rôle | Observations |
|---|---|---|
| `id` | identifiant numérique (positif) | **clé de référence dans toutes les expressions (`#42`)** |
| `name` | identifiant symbolique | utilisé dans `Condition.operand` |
| `label` | libellé affiché | |
| `type` | type ouvert (cf. §3.1) | |
| `default` | valeur ou expression initiale | évaluée au démarrage |
| `content` | expression calculée | recalculée à chaque réactivité (cas typique des dérivées) |
| `min`, `max` | bornes (numériques ou date) | **peuvent être des expressions** : `min="year(now) - 1"` |
| `unit` | suffixe d'affichage (`€`, `kg`, `%`) | |
| `round` | nombre de décimales (default `2`) | |
| `pattern` | regex de validation | rarement utilisé dans le corpus |
| `source` | id de Source qui peuple ce Data | couplé à `index` |
| `index` | clé extraite de la ligne source | format `'colonne'` (chaîne littérale) |
| `memorize` | persistance inter-session | non utilisé MVP |
| `autocomplete` | hint de saisie HTML | |
| Sous-éléments | `Choices` (options), `Table` (colonnes), `Description` | cf. §3.2 |

### 3.1 Types observés dans le corpus

Types **utilisés** : `text`, `integer`, `number`, `money`, `percent`, `boolean`, `choice`, `date`, `month`, `year`, `textarea`.

Types **déclarés dans le XSD mais absents du corpus** : `day`, `multichoice`, `multitext`, `table`, `department`, `region`, `country`, `array`. À considérer hors MVP sauf demande explicite.

### 3.2 `Choices` (options d'un `type="choice"`)

Liste de `<Choice id value label>`. Source possible (sous-élément `<Source>` référençant un id de `Sources` global) — non utilisé dans le corpus MVP. Les `ChoiceGroup` ne sont pas utilisés non plus.

## 4. Step → Panel → FieldSet / BlockInfo

### 4.1 `FieldSet` et `Field`

`FieldSet` regroupe des `Field` (saisies ou sorties). Chaque `Field` référence un `Data` par `data="id"` et a un `usage` (`input` / `output`). Les attributs `disposition` (`classic`/`grid`/`inline`) et `display` (`inline`/`grouped`/`accordion`/`pop-in`) — **seul `classic/inline` est observé dans le corpus**. Le mode `accordion/pop-in` apparaît dans le XSD mais pas dans les XML curés.

Sous-éléments `PreNote` et `PostNote` = RichText d'aide contextuelle, observés dans `frais-locataire` et `taxeLogementsVacants`.

L'attribut `widget` (string libre — ex. `geoAPILocalities`, `geoAPIZipCodeGetInfo`) injecte un composant spécifique au runtime portail. **À traiter comme un hint de rendu côté MVP**, pas comme une primitive de schéma.

### 4.2 `DataGroup`

Regroupement nommé de `Data` (uniquement structurel : aucun moteur d'itération). Sert à organiser les variables et à les cibler en bloc dans une `Action` (`target="datagroup"`, observé pour `notifyWarning`). **Pas de répétition** : la duplication mensuelle de `gratification-stagiaire` se fait par recopie manuelle (`donneesMois1`…`donneesMois12`), ce qui motive le groupe répétable post-MVP.

### 4.3 `BlockInfo`

Conteneur de texte riche structuré, **différent** de `FieldSet`. Hiérarchie `BlockInfo > Chapter > Section`. Chaque `Section.Content` est du RichText avec interpolation `#id` (ex. `#3 n'est pas en zone tendue`). C'est le **principal vecteur d'affichage conditionnel** : les règles ciblent souvent une `Section` particulière avec `showObject/hideObject`. `Chapter.collapsible` introduit un accordéon natif.

### 4.4 `ActionList`

Boutons de navigation (`what` ∈ {`submit`, `reset`, `execute`}, `for` ∈ {`priorStep`, `currentStep`, `nextStep`, `jumpToStep`, `newSimulation`, `externalPage`, `function`}). Le corpus MVP utilise seulement `submit/newSimulation` (cf. `taxeLogementsVacants` : un bouton "Recommencer la simulation"). Les Actions de boutons peuvent être masquées par règle (cible `target="action"` avec `action="Restart"`).

### 4.5 `FootNotes`

Notes de bas de page numérotées, référencées depuis le RichText par la syntaxe `[(*)^N(…)]` (observée dans `frais-locataire`). Affichage conditionnable par règle.

## 5. `BusinessRules` — la logique réactive

Une `BusinessRule` a trois sections obligatoires : `Conditions` + `IfActions` + `ElseActions` (les deux dernières peuvent être vides).

### 5.1 `Conditions` : double représentation

C'est le point central pour le mode guidé ⇄ expert :

```xml
<Conditions value="defined(#3) &amp;&amp; defined(#2) &amp;&amp; #2 = 0">
  <Connector type="all">
    <Condition operand="nomCommune" operator="present" />
    <Condition operand="frais" operator="present" />
    <Condition operand="frais" operator="=" expression="0" />
  </Connector>
</Conditions>
```

- `@value` = représentation **textuelle/expert** (chaîne d'expression complète).
- Enfant `Connector`/`Condition` = représentation **structurée/guidée** (arbre AST). Cf. `expressions-grammar.md` pour la grammaire.
- `Connector.type` ∈ {`all`, `any`, `none`} — toujours récursif.
- `Condition` = nœud feuille : `operand` (nom d'un Data), `operator`, `expression?` (chaîne à comparer).

### 5.2 `Action` (effet d'une règle)

Six `name` possibles, **tous observés dans le corpus** sauf `setAttribute target≠content` (cf. plus bas) :

| `name` | Effet | Cibles `target` observées |
|---|---|---|
| `showObject` / `hideObject` | visibilité | `field`, `fieldset`, `section`, `chapter`, `blockinfo`, `footnote`, `action`, `step`, `panel` |
| `setAttribute` | écrit `content` | dans le corpus : **uniquement `target="content"`** (assignation de la valeur calculée d'un Data) |
| `unsetAttribute` | efface `content` | idem |
| `notifyError` | validation bloquante | `target="data"` (rattaché à un Data ou un `datagroup`) |
| `notifyWarning` | validation non bloquante | `target="data"` ou `target="datagroup"` |

Le XSD prévoit aussi `target` ∈ {`min`, `max`, `default`, `index`, `choice`, `prenote`, `postnote`} mais **aucun de ces ciblages n'apparaît dans le corpus**. À garder hors MVP.

## 6. `Sources` — datasources

Chaque `Source` a une `datasource` (nom symbolique → résolveur côté runtime), un `request` (SQL ou URI), un `returnType` (`assocArray`, `singleValue`, `json`, `xml`, `html`, `csv`), des `Parameter` (origin `data` ou `constant`, type `columnValue`/`queryString`/`path`/`data`/`header`).

Le corpus MVP n'utilise que :
- `returnType="assocArray"` (lignes SQL)
- `Parameter.origin="data"` + `type="columnValue"` (substitué via `%1$s`, `%2$d`, etc. — placeholders `printf` PHP)
- `request` SQL ; les paramètres `format="Y-m-d"` formatent une `date` avant substitution.

`requestType="complex"` n'apparaît qu'en `gratification-stagiaire` (concaténation `'%1$s' || '-' || '%2$s' || '-15'`).

## 7. Propriétés que le runtime doit calculer dynamiquement

Pour chaque tour de boucle réactive (après chaque saisie), le moteur doit recalculer :

1. **Valeur de chaque `Data`** : si `content` est défini → évaluer l'expression ; sinon, valeur saisie / défaut / valeur de source.
2. **Visibilité** de chaque objet ciblable (`Field`, `FieldSet`, `Section`, `Chapter`, `BlockInfo`, `FootNote`, `Step`, `Panel`, `Action`) : déterminée par l'**union** des `BusinessRule` qui la mentionnent (dernière règle exécutée gagne, selon l'ordre du XML).
3. **Messages d'erreur/warning** (`notifyError`/`notifyWarning`) : agrégés par `Data` cible.
4. **Bornes dynamiques** : `min` et `max` peuvent être des expressions (`min="year(now) - 1"`). À évaluer à chaque cycle.
5. **Source data refresh** : quand un paramètre `data="X"` change, la `Source` doit être ré-exécutée et son résultat ré-indexé par `Data.@index`.

## 8. Schéma ASCII des relations clé

```
        Simulator
             |
   +---------+----------+--------+----------+
   |         |          |        |          |
 DataSet   Steps     Sources  Business-  RelatedInfo
   |         |          |       Rules
Data*    Step*       Source*   BusinessRule*
   |         |          |          |
   |     Panel*    Parameter*  Conditions
   |         |                     |
   |   FieldSet|BlockInfo      Connector*\/Condition
   |         |                     |
   |    Field*|Chapter         (operand→Data.name)
   |         |                     |
   |     (data→Data.id)        IfActions/ElseActions
   |                                |
   |                            Action*
   |                                |
   |              (target→Field/Section/Data/…)
   |
 references via #id (numérique) dans expressions, content, value
```

## 9. Points d'ambiguïté à clarifier

1. **Ordre d'évaluation des `BusinessRule`** : l'ordre XML est-il sémantiquement significatif (pile de visibilités) ou les règles sont-elles « toutes vraies simultanément » avec calcul de point fixe ? Le code G6K legacy (à creuser en phase 2 si besoin) tranche, mais le corpus ne lève pas l'ambiguïté de manière formelle.
2. **`setAttribute target="content"` ne ciblant pas un Data calculé** : que faire si un Data saisi est ciblé ? Vu dans le corpus seulement sur des Data sans `content` initial (ex. `taxeLogementsVacants` data #4 boolean). Comportement à figer.
3. **`profiles`** : présents au XSD, **inutilisés dans le corpus**. À ne pas implémenter avant qu'un cas réel apparaisse.
