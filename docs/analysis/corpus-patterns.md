# Patterns observés dans le corpus G6K — primitives minimales pour le MVP

> Pour chacun des 5 simulateurs `_corpus/g6k/`, fiche structurée des capacités effectivement mises en œuvre. Les listes finales (§6 et §7) sont **la liste des primitives à implémenter dans `packages/schema`/`engine`/`blocks`/`functions`**. Toute primitive **non listée en §6** doit être traitée comme hors MVP et nécessite une question de cadrage.

## 1. `frais-locataire` — 150 lignes

- **Type de sortie** : arbre de décision (zonage textuel conditionnel).
- **Étapes** : 1 step (`zonage`).
- **Données** : 3 Data
  - 1× `text` (input, code INSEE commune, widget `geoAPILocalities`)
  - 2× résolus via Source : `nomCommune` (text, index `'commune'`), `frais` (integer, index `'frais'`)
- **Sources** : 1× SQL inline (`zonage-commune` : `SELECT … FROM zonageCommunes WHERE codeInsee = '%1$s'`).
- **Règles** : 4 BusinessRule
  - R1 : visibilité globale du résultat (Connector `all` de 2 `present`)
  - R2/R3/R4 : exclusivité mutuelle des 3 sections (zone non-tendue / tendue / très tendue), discriminée par `#2 = 0|1|2`
  - Profondeur max : 1 niveau de Connector
- **Actions utilisées** : `showObject`, `hideObject` (cibles `blockinfo`, `section`, `footnote`)
- **Fonctions** : `defined` seulement (côté `Conditions/@value`)
- **Particularité** : 3 `Section` jumelles avec **texte structurellement identique** ne variant que sur le tarif (8/10/12 €). Pattern « variants textuels par section » qui justifie le bloc `Section conditionnée`.

## 2. `taxeLogementsVacants` — 153 lignes

- **Type de sortie** : arbre de décision (oui/non + texte explicatif).
- **Étapes** : 1 step (`zonage`).
- **Données** : 7 Data
  - 2× saisies : `commune` (text, widget `geoAPIZipCodeGetInfo`)
  - 5× calculés ou résolus : `nomCommune`, `CodeInsee`, `RecevableTaxeLogementVacant` (boolean), `RecevablePlus50000` et `RecevableDesequilibre` (text issus de 2 sources)
- **Sources** : 2× SQL inline (datasource `TaxeLogementVacant`, deux tables `PlusDe50000` et `DesequilibreOffreEtDemande`).
- **Règles** : 5 BusinessRule
  - R1 : afficher/masquer le bouton « Recommencer »
  - R2 : assigner `CodeInsee` et `nomCommune` via fonctions métier (`setAttribute` avec `getInsee(#1)` / `getNomVille(#1)`)
  - R3/R4/R5 : visibilité des chapitres « TLV s'applique » vs « TLV ne s'applique pas »
  - Profondeur max : 2 niveaux (`Connector all` ⊃ `Connector any`)
- **Actions utilisées** : `showObject`, `hideObject`, `setAttribute target="content"`, `unsetAttribute`
- **Fonctions standard** : `defined`
- **Fonctions métier** : `getInsee`, `getNomVille`
- **Particularité** : exemple-type d'**affectation calculée** via `setAttribute target="content"`. Pattern central du MVP.

## 3. `TaxeAuPoids` — 805 lignes

- **Type de sortie** : calcul (€).
- **Étapes** : 1 step (`Calcul`).
- **Données** : ~30 Data dont
  - Inputs `choice` (8 choix multiples : démarche, type véhicule, exonération, conducteur, oui/non transformation, hybride, etc.)
  - 1× `date` (`dateImmatriculation`)
  - 1× `integer` (`poidsSaisi`)
  - Calculés : `annee=year(#8)`, `calculDeLaTranche=(#19-(#15-1))*#13`, `poidsRetenu=#10-#18`, `valeurTaxe=#12+#14`, etc.
  - Résolus de source : `tranche`, `report`, `prixKg`, `debutTranche` (4 colonnes d'une même ligne SQL)
- **Sources** : 1× SQL paramétré multi-param (`Tmom WHERE %2$d = annee AND %1$d <= trancheFin AND %1$d >= trancheDebut`).
- **Règles** : 36 BusinessRule (R1–R36)
  - Mix de discrimination par `choice` (`#22 = 'Autre'`, `#23 = 'VT'`), bornes (`#8 < 1/1/2024`, `#10 < #1`), et assignations conditionnelles (`setAttribute data="1" value="1800"` selon date).
  - Profondeur max observée : 1 niveau Connector `all`, pas d'imbrication.
- **Actions utilisées** : `showObject`, `hideObject` (sur `field`, `section`), `setAttribute target="content"`, `unsetAttribute`
- **Fonctions** : `defined`, `year`
- **Particularité** : **barème inline** dans le `Data.@content` (`#12 + #14` = report précédent + calcul tranche). Arithmétique avec parenthèses imbriquées. Comparaisons à une **date littérale** (`1/1/2024`).

## 4. `forfaits` — 1231 lignes

- **Type de sortie** : calcul (recommandation de forfaits).
- **Étapes** : 3 steps (`choix` dynamique, `choix2` statique, `impressionPDF` — **PDF hors MVP**).
- **Données** : ~150 Data (énorme duplication par tranche de forfait : 7 forfaits × 7 tranches × 3 types de marchés)
  - 15 saisies (`integer min="0"` — nombres d'avis)
  - Catalogue inline : `prixForfait1..7` (money), `nbUPForfait1..7` (integer), `nbUPOffertsForfait1..7` (integer) — **valeurs en dur dans `content="1350"`, `content="2700"`, etc.**
  - Cascade de calculs par division entière : `floor(#16 / (#36 + #46))`, puis modulo manuel `#16 - (#60 * (#36 + #46))`, etc.
- **Sources** : aucune.
- **Règles** : 47 BusinessRule
  - R1–R15 : `notifyError` sur chaque saisie négative
  - R16–R18 : visibilité de boutons d'action selon `dynamic = 1|0` (attribut système) et `#21 (gridOK)`
  - R19–R27 : visibilité de notes de bas de page
  - Reste : `setAttribute target="content"` pour les drapeaux `AvisMapaNational`/`AvisEuropeen`, calculs de % d'économie
  - Profondeur max : 1 niveau Connector
- **Actions utilisées** : `showObject`, `hideObject`, `setAttribute target="content"`, `notifyError`
- **Fonctions** : `defined`, `floor`, `sum`
- **Particularité critique** : la **duplication massive par tranche** (`nbForfait7MapaNational`, `nbForfait6MapaNational`, …, `nbForfait1MapaNational`, et pareil pour `MapaEuropeen`, `Europeen`) **est exactement le pattern que résoudra le groupe répétable post-MVP**. Cf. §7.

## 5. `gratification-stagiaire` — 1990 lignes

- **Type de sortie** : calcul (gratification mensuelle + cumul).
- **Étapes** : 2 steps (`calcul`, `impressionPDF` — **PDF hors MVP**).
- **Données** : ~200 Data
  - 1× `date` (`dateSignatureConvention`)
  - 12× `DataGroup donneesMois<N>` (un par mois), chacun avec ~10 Data : `mois<N>` (month), `an<N>` (year), `joursOuvrables<N>=workdaysofmonth(...)`, `joursPresence<N>` (number), `nbheures<N>` (number), `plafondHoraire<N>` (money, issu de Source), `gratificationMinHeure<N>` (money), `prevAn<N>=#X-1` (year), `gratification<N>=#X*#Y` (money), `premierJour<N>eMois='1/'+#X+'/'+#Y` (date — par concat)
  - `tauxMinimal` (percent) issu de Source #2
- **Sources** : 8× SQL inline (datasource `gratification-stagiaire`)
  - `plafondHoraire` + `tauxMinimal` initiaux (selon date convention)
  - 12× `plafondHoraire` pour chaque mois (avec `requestType="complex"` car concaténation SQL)
- **Règles** : 30+ BusinessRule
  - 12× pairs d'`notifyError` / `notifyWarning` (un par mois) — alerte sur heures négatives / plafond pas encore connu
  - Visibilités d'étapes mensuelles selon date courante (`#10 > year(now) && #10 > #148`)
  - Quelques `setAttribute` (`max(#5, #6)`, fallback `#5`)
  - Profondeur max : 1 niveau
- **Actions utilisées** : `showObject`, `hideObject`, `setAttribute target="content"`, `notifyError`, `notifyWarning`
- **Fonctions** : `defined`, `year`, `workdaysofmonth`, `max`, `count`
- **Particularité** : **cas extrême de duplication mensuelle** (~12× le même bloc). Confirme la nécessité du groupe répétable post-MVP. Aussi : montre que `+` peut concaténer une chaîne et un nombre (`'1/' + #9`) → coercion à spécifier.

---

## 6. Primitives MINIMALES à supporter pour le MVP

### 6.1 Types de `Data`

`text`, `textarea`, `integer`, `number`, `money`, `percent`, `boolean`, `choice`, `date`, `month`, `year`. **(11 types)**

### 6.2 Attributs de `Data` à supporter

`id`, `name`, `label`, `type`, `default`, `content`, `min`, `max`, `unit`, `round`, `source`, `index`, `description` (sous-élément RichText). **(11 attributs)**

### 6.3 Opérateurs

- **Arithmétiques** : `+`, `-`, `*`, `/`, `()`. `+` polymorphe (somme ou concat string). **(4 + parens)**
- **Comparaison** : `=`, `!=`, `<`, `<=`, `>`, `>=`. **(6)**
- **Logiques** : `&&`, `||`, `!`. **(3)**
- **Spéciaux mode guidé** : `present`, `blank`, `isTrue`, `isFalse`. **(4)**
- **Connecteurs structurés** : `all`, `any`, `none`. **(3)**

**Total : 20 opérateurs.**

### 6.4 Fonctions standard à inscrire au registre `engine`

`defined(x)`, `year(date|now)`, `floor(x)`, `sum(a, b, …)`, `max(a, b, …)`, `count(…)`. **(6 fonctions)**

**Note `count`** : observée 1 fois seulement dans le corpus — usage à clarifier en phase 2. Considérée comme MVP par sûreté.

### 6.5 Fonctions métier à inscrire au registre `functions`

`workdaysofmonth(month, year)`, `getInsee(commune)`, `getNomVille(commune)`. **(3 fonctions)**

### 6.6 Actions

`showObject`, `hideObject`, `setAttribute` (uniquement avec `target="content"`), `unsetAttribute` (idem), `notifyError`, `notifyWarning`. **(6 actions)**

Cibles `target` à supporter : `field`, `fieldset`, `section`, `chapter`, `blockinfo`, `footnote`, `action`, `step`, `panel`, `data`, `datagroup`, `content`. **(12 cibles)**

### 6.7 Sources

`returnType="assocArray"` uniquement. Paramètres `type="columnValue"`, `origin="data"` (substitués via `printf`-style `%1$s`, `%2$d`). Datasources `database` SQL (en mode SELECT). `requestType="complex"` requis (concat) — observé en gratification.

### 6.8 Conteneurs de mise en page

`Simulator` → `DataSet` (+ `DataGroup` purement structurel) → `Steps` → `Step` → `Panels` → `Panel` → `FieldSet` (avec `Field`) **et/ou** `BlockInfo` (avec `Chapter` → `Section`) → `ActionList` (boutons) → `FootNotes`.

RichText : interpolation `#id` dans `Content`, `Annotations`, `PreNote`, `PostNote`, `Description`, `FootNote`.

### 6.9 Référence d'expression

Une seule forme : `#<id_numérique>` (cf. `expressions-grammar.md` §2.2). Le **nom** sert dans `Condition.@operand` pour le mode guidé, jamais dans une expression textuelle.

### 6.10 Mot-clé spécial

`now` (date courante, granularité jour, timezone `Simulator.@timezone`).

---

## 7. Primitives à EXCLURE ou REPOUSSER

### 7.1 Hors périmètre MVP (présent au XSD, présent au corpus, mais reporté)

| Élément | Pourquoi reporté | Cible |
|---|---|---|
| Step `output="downloadablePDF"` / `inlinePDF` / `inlineFilledPDF` etc. | Génération PDF/CERFA hors MVP | v1.x dédié |
| Step de duplication (cas `forfaits`, `gratification-stagiaire`) | Motive le **groupe répétable** post-MVP | v1.1 — non MVP |
| `DataGroup` itératif | Idem (le `DataGroup` structurel reste MVP, c'est l'itération qui est hors MVP) | v1.1 |
| `requestType="complex"` Source SQL | Une seule occurrence (gratification) ; couplé au cas répétable | v1.1 |

### 7.2 Hors périmètre MVP (présent au XSD, **absent du corpus**)

| Élément | Décision |
|---|---|
| Types `day`, `multichoice`, `multitext`, `table`, `department`, `region`, `country`, `array` | **Exclure du MVP**. Aucun cas dans le corpus. À réintroduire seulement sur demande explicite. |
| `Profiles` | **Exclure du MVP**. Aucun simulateur du corpus ne définit de profil de pré-remplissage. |
| `Sites` | **Exclure**. Indexation portail-d'origine, hors scope. |
| `Action.what="execute"` et `for="function"` / `for="externalPage"` | **Exclure**. Le corpus utilise `submit` / `newSimulation`. |
| `setAttribute target` ≠ `content` (i.e. `min`, `max`, `default`, `index`, `choice`, `prenote`, `postnote`) | **Exclure**. Aucun usage corpus. À tracer en ADR si réintroduit. |
| `FieldSet.@display="accordion"` / `"pop-in"` | **Exclure**. Le bloc `accordion` portail-elec passe par un **nouveau bloc DSFR**, pas par cet attribut XSD. |
| `Field.@widget` (string libre) | **Exclure des primitives** mais documenter en hint UI. Les widgets `geoAPILocalities`/`geoAPIZipCodeGetInfo` sont des cas portail-spécifiques (= hors corpus pur G6K à reproduire). |
| `ChoiceGroup`, `Choices/Source` (choix dynamiques) | **Exclure**. Aucun usage corpus MVP. |
| `Columns` + `FieldRow` (grille tabulaire d'inputs) | **Exclure**. Aucun usage corpus MVP. |
| `Connector type="none"` (négation structurée) | **À évaluer** : présent dans le XSD, jamais utilisé dans le corpus comme racine ; on peut l'exprimer via `!(…)` en mode expert et garder `none` au schéma pour cohérence. Décision à prendre en phase 2. |
| `Action.target="action"` (masquer un bouton) | **Garder MVP** : observé dans `taxeLogementsVacants` R1 (Restart). |

### 7.3 Hors corpus mais souhaité pour le MVP portail-elec

Cf. `_corpus/targets.md` §3 — extensions via les mécanismes existants :

- Variant UI `range` (slider) → hint de rendu sur `number`, **pas une nouvelle primitive de schéma**.
- Bloc `accordion`, `kpi-card`, `breakdown-table` → ajoutés au **registre `packages/blocks`** sans toucher au schéma.
- Fonctions `tableLookup`, `pv`, `cumulativeSum` → ajoutées au **registre `packages/functions`** sans toucher au schéma.

### 7.4 Définitivement hors périmètre (cf. CLAUDE.md §7, §14)

- Évaluation par `eval()` / `new Function()` — interdiction stricte. Tout passe par l'AST `jsep` borné.
- Boucle ou récursion dans les expressions.
- Import/export G6K XML automatisé (post-MVP éventuel).
- Cartes Leaflet, export PDF, lettres guidées.

---

## 8. Synthèse en chiffres

- **11** types de Data MVP
- **20** opérateurs (4 arith + 6 cmp + 3 log + 4 spéciaux + 3 connecteurs)
- **6** fonctions standard
- **3** fonctions métier
- **6** actions
- **12** cibles d'Action
- **1** type de datasource MVP (`database`/SQL avec assocArray)
- **1** seule forme de référence (`#id` numérique)

Toute primitive ajoutée au-delà de ces totaux doit être justifiée par un cas concret hors corpus G6K (typiquement : portail-elec) — et faire l'objet d'une **question de cadrage**.
