# Mode guidé ⇄ mode expert : où passe la frontière ?

> Principe directeur (cf. `CLAUDE.md` §2) : « Chaque brique éditable a deux vues d'une même donnée. Le guidé est une **projection** de la représentation interne, jamais un système parallèle. » Ce document précise concrètement, sur trois dimensions, ce que cela implique.

## 1. Préalable : ce qui n'est PAS un choix de mode

Quelques éléments **n'ont pas besoin d'un mode expert** dans l'éditeur — le guidé suffit, parce qu'ils sont déjà déclaratifs et structurés :

- Définir un `Data` (id/name/label/type/unit/round/min/max statiques)
- Ajouter une `Choice` à un `type="choice"`
- Câbler une `Source` à un `Data` (`source="3"`, `index="'colonne'"`)
- Placer un `Field` dans un `FieldSet`
- Ordonnancer les `Step` / `Panel`

Le mode expert intervient **dès qu'apparaît une expression**. C'est pour ces trois dimensions qu'il faut prévoir la double vue.

## 2. Dimension 1 : Conditions

### Mode guidé

Représentation arborescente du `Connector` racine. À chaque nœud :
- un **sélecteur de type** (radio `tous / au moins un / aucun`)
- pour chaque enfant `Condition` :
  - **sélecteur d'opérande** = picker de Data (suggérant par `label` mais retournant `name`)
  - **sélecteur d'opérateur** dans `present / blank / = / ≠ / < / ≤ / > / ≥ / est vrai / est faux`
  - si l'opérateur n'est pas existentiel ni booléen : champ `expression` (texte, nombre, ref `#X`, ou date)
- bouton « ajouter une condition / un sous-groupe »

### Mode expert

Champ texte unique contenant l'expression équivalente : `defined(#3) && #2 = 0`.

### Exemple corpus 1 : `frais-locataire` R4

**XML (vue interne) :**
```xml
<Conditions value="defined(#3) &amp;&amp; defined(#2) &amp;&amp; #2 = 2">
  <Connector type="all">
    <Condition operand="nomCommune" operator="present"/>
    <Condition operand="frais" operator="present"/>
    <Condition operand="frais" operator="=" expression="2"/>
  </Connector>
</Conditions>
```

**Vue guidée :**
```
[Tous ▼] doivent être vrais :
  • [nomCommune ▼] [est présent ▼]
  • [frais       ▼] [est présent ▼]
  • [frais       ▼] [=          ▼] [2]
[+ Ajouter une condition]  [+ Ajouter un sous-groupe]
```

**Vue expert :**
```
defined(#3) && defined(#2) && #2 = 2
```

### Exemple corpus 2 : `taxeLogementsVacants` R3 (avec imbrication)

**XML :**
```xml
<Conditions value="defined(#1) &amp;&amp; (#7 = 1 || #6 = 1)">
  <Connector type="all">
    <Condition operand="commune" operator="present"/>
    <Connector type="any">
      <Condition operand="RecevableDesequilibre" operator="=" expression="1"/>
      <Condition operand="RecevablePlus50000" operator="=" expression="1"/>
    </Connector>
  </Connector>
</Conditions>
```

**Vue guidée :**
```
[Tous ▼] doivent être vrais :
  • [commune ▼] [est présent ▼]
  • [Au moins un ▼] doit être vrai :
      • [RecevableDesequilibre ▼] [= ▼] [1]
      • [RecevablePlus50000    ▼] [= ▼] [1]
```

**Vue expert :**
```
defined(#1) && (#7 = 1 || #6 = 1)
```

## 3. Dimension 2 : Calculs et affectations (`content`, `default`, `Action value`)

### Mode guidé

Plusieurs paliers de complexité — le guidé doit gracieusement « tomber » sur l'expert pour les cas non couverts :

1. **Constante littérale** : champ unique typé (`1350`, `0.15`, `'Autre'`).
2. **Référence simple** : picker de Data.
3. **Opération arithmétique à deux opérandes** : `[Data ▼] [+/-/*/÷ ▼] [Data ou littéral]`.
4. **Appel de fonction connu** : `[fonction ▼]` suivi de N pickers d'arguments (signature lue dans le registre).
5. **Expression complexe** : un bouton « passer en mode expert » qui ouvre le champ texte.

### Mode expert

Champ texte avec la syntaxe `jsep` du parser engine (cf. `expressions-grammar.md`).

### Exemple corpus 1 : `TaxeAuPoids` Data #14 (calcul de tranche)

**XML :** `<Data id="14" name="calculDeLaTranche" type="integer" content="(#19 - ( #15 - 1) ) * #13"/>`

**Vue guidée (palier 5, expression complexe — bouton « expert » obligatoire) :**
```
calculDeLaTranche = [ Mode expert : (#19 - (#15 - 1)) * #13 ]
```

Justification : trois opérandes + parenthèses imbriquées dépassent ce que le guidé palier 3 sait représenter sans ouvrir un mini-éditeur d'AST. Il est plus honnête de basculer en expert.

### Exemple corpus 2 : `taxeLogementsVacants` R2 action 1

**XML :** `<Action data="5" value="getInsee(#1)" name="setAttribute" target="content"/>`

**Vue guidée :**
```
Affecter à [CodeInsee ▼] la valeur :
  Fonction : [getInsee ▼]
  Arguments :
    • commune = [commune ▼]
```

**Vue expert :**
```
CodeInsee = getInsee(#1)
```

### Exemple corpus 3 : `gratification-stagiaire` Data #129 (concat date)

**XML :** `<Data id="129" name="premierJour1erMois" type="date" content="'1/' + #9 + '/' + #10"/>`

**Vue guidée** : sans doute en mode expert d'office (concaténation string + nombre = forme idiomatique mais pas une opération arithmétique pure). Acceptable.

**Vue expert :**
```
premierJour1erMois = '1/' + #9 + '/' + #10
```

## 4. Dimension 3 : Datasources

### Mode guidé

Trois sous-cas selon `Source.datasource` :

1. **Datasource `inline`** : table éditable dans l'UI (rangées + colonnes). Reste exclusivement guidé.
2. **Datasource `database`** : sélecteur de table + sélecteur de colonnes + filtres prédéfinis. Bascule vers expert dès que le filtre exige du SQL custom (jointures, sous-requêtes).
3. **Datasource `api`** : sélecteur d'endpoint pré-enregistré (catalogue côté admin), saisie des paramètres. L'URI brute n'est jamais éditée directement par le contributeur sauf passage en expert.

### Mode expert

- Datasource SQL : champ texte avec `printf`-style placeholders `%1$s`, `%2$d`, etc. — exactement le format observé dans le corpus.
- Datasource API : URI complète avec placeholders.

### Exemple corpus : `frais-locataire` Source #1

**XML :**
```xml
<Source id="1" datasource="zonage-commune" label="Zonage commune"
        request="SELECT commune, zone, preavis, frais
                 FROM zonageCommunes WHERE codeInsee = '%1$s'"
        returnType="assocArray" returnPath="0">
  <Parameter type="columnValue" origin="data" name="insee" data="1"/>
</Source>
```

**Vue guidée :**
```
Source : [zonage-commune ▼]    (base SQL)
Table  : [zonageCommunes ▼]
Colonnes retournées : ☑ commune  ☑ zone  ☑ preavis  ☑ frais
Filtre :
  • codeInsee = paramètre [insee ◀ depuis le Data : commune ▼]
```

**Vue expert :**
```sql
SELECT commune, zone, preavis, frais
FROM zonageCommunes
WHERE codeInsee = '%1$s'
```

Paramètres (toujours en guidé, pas en expert — c'est un appariement nom/Data, pas une expression) :
```
%1$s ← Data: commune
```

### Exemple corpus 2 : `TaxeAuPoids` Source #1 (deux paramètres)

```sql
SELECT annee, tranchedebut as trancheDebut, …
FROM Tmom
WHERE %2$d = annee AND %1$d <= trancheFin AND %1$d >= trancheDebut
```

Vue guidée :
```
Table : Tmom
Filtres :
  • annee = paramètre annee (%2)   ← Data poidsRetenu  …  attendre : pas l'année !
```

⚠️ **Subtilité corpus** : ici le placeholder `%1` (poidsRetenu) apparaît deux fois et `%2` (annee) une fois — l'ordre des placeholders n'est pas celui des `<Parameter>` (qui sont déclarés `poids` puis `annee` mais `%1$d` désigne le premier). Le guidé doit donc :
1. Lister les paramètres déclarés.
2. Pour chaque, montrer où il est utilisé (`%N$d` dans le SQL).
3. Permettre l'appariement à un Data.

C'est faisable mais demande de l'attention dans l'éditeur. À documenter.

## 5. Règle d'invariance guidé ⇄ expert

**Conversion idempotente** : pour toute expression `E` :

1. **expert → guidé → expert** doit donner `E` modulo whitespace et parenthèses non-significatives.
2. **guidé → expert → guidé** doit donner la même structure d'arbre.

### Conséquences pratiques

- Le **parser** doit produire un AST normalisé (suppression des espaces, parenthèses canoniques selon précédence).
- Le **renderer expert** sérialise cet AST de façon déterministe (ordre des opérandes commutatifs respecté, parenthèses minimales).
- Le **renderer guidé** consomme directement l'AST, jamais le texte.
- L'**éditeur** persiste **les deux représentations** dans le XML/JSON cible (cf. corpus : `Conditions/@value` ET `<Connector>/<Condition>` cohabitent intentionnellement) : la première sert au moteur run-time, la seconde au mode guidé. La cohérence est vérifiée à la sauvegarde — si l'une diverge, l'éditeur signale une erreur de migration.

### Cas où l'invariance se rompt — à traiter explicitement

1. **Expression non guidable** (ex. `'1/' + #9 + '/' + #10`) : le guidé affiche « expression complexe (éditer en expert) » et expose un bouton pour revenir au mode expert. Pas de tentative de représentation guidée approximative.
2. **Expression non parsable** (saisie expert syntaxiquement invalide) : le guidé reste désactivé tant que l'expression ne parse pas ; l'utilisateur voit l'erreur en place.
3. **Opérateurs `present`/`blank`/`isTrue`/`isFalse`** (mode guidé) vs `defined(...)` / `!defined(...)` / `#x` / `!#x` (mode expert) : la conversion doit être déterministe et documentée (cf. `expressions-grammar.md` §3.4). On choisira **une forme canonique côté expert** (probablement `defined(#X)` pour `present`).

---

## 6. Résumé sous forme de tableau de frontière

| Élément | Mode guidé | Mode expert | Décrochage habituel |
|---|---|---|---|
| Condition simple | ✅ picker + opérateur + valeur | ✅ équivalent texte | jamais |
| Condition imbriquée (≤ 3 niveaux) | ✅ arbre visuel | ✅ texte avec parens | jamais |
| Calcul à 2 opérandes | ✅ palette `[+ - * /]` | ✅ texte | si > 2 opérandes ou parenthèses |
| Appel de fonction connue | ✅ formulaire d'arguments | ✅ texte | si arg = expression complexe |
| Concat de string et nombre | ❌ | ✅ texte | toujours expert |
| Expression libre / cas exotique | ❌ | ✅ texte | toujours expert |
| Datasource inline (table) | ✅ tableur | ❌ pas pertinent | jamais |
| Datasource SQL standard | ✅ table + colonnes + filtres | ✅ SQL brut | si SQL custom (joins, sous-requêtes) |
| Datasource API | ✅ catalogue + paramètres | ✅ URI brute | si endpoint hors catalogue |
