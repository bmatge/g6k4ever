# Grammaire des expressions G6K

> Spec de la grammaire à implémenter dans `packages/engine` (parser `jsep` + évaluateur borné). **Tout ce qui suit est validé par le corpus.** Les éléments douteux ou observés une seule fois sont signalés.

## 1. Trois contextes d'expression

Les expressions G6K apparaissent dans **quatre attributs** :

| Contexte | Sémantique attendue | Exemples corpus |
|---|---|---|
| `Data/@default` | valeur initiale | `default="(#4 * 200)"`, `default="0"`, `default="500"` |
| `Data/@content` | valeur calculée dynamique | `content="#10 - #18"`, `content="year(#8)"`, `content="workdaysofmonth(#10, #9)"` |
| `Data/@min`, `Data/@max` | borne (numérique ou date) | `min="year(now) - 1"`, `max="year(now) + 5"` |
| `Conditions/@value` | booléen | `defined(#3) && defined(#2) && #2 = 0` |
| `Condition/@expression` | opérande droit d'une comparaison | `expression="0"`, `expression="#1"`, `expression="Autre"`, `expression="1/1/2024"` |
| `Action/@value` | expression assignée (`setAttribute`) ou message (`notifyError`/`notifyWarning`) | `value="getInsee(#1)"`, `value="((#102 - #105) / #102) * 100"`, `value="Cette valeur doit être positive"` |
| `Section/Content`, `Annotations`, RichText | interpolation simple `#id` dans du texte | `#3 est en zone tendue` |

## 2. Lexique

### 2.1 Littéraux

- **Entier** : `0`, `42`, `1800`, `1600` (utilisés tels quels)
- **Décimal** : non observé directement dans le corpus (les calculs partent toujours d'entiers ; les types `money`/`percent` reçoivent des entiers ou des résultats arithmétiques). Format à supposer **point décimal `.`** dans le code, le `decimalPoint=","` du `DataSet` ne concernant que l'**affichage** côté UI.
- **Chaîne** : `'Autre'`, `'commune'`, `'frais'`, `''` (chaîne vide). Quotes simples uniquement dans le corpus.
- **Date littérale** : `1/1/2024` (format `d/m/Y` selon `DataSet.dateFormat`). Apparaît dans `Condition.expression="1/1/2024"` et dans le `value` d'expressions arithmétiques (`'1/' + #9 + '/' + #10`).
- **Booléen** : `true`, `false` — observés dans `Action.value="true"` / `value="false"` (`taxeLogementsVacants` R3, `forfaits` R…). Note : la condition `#21` toute seule fonctionne aussi (cf. `forfaits` R17 : `dynamic = 1 && !#21`).

### 2.2 Références

**Une seule forme observée** : `#<id_numérique>`. Exemples : `#1`, `#10`, `#148`.

⚠️ La forme `#<nom>` n'apparaît **jamais** dans les expressions du corpus. Le **nom** n'est utilisé que dans `Condition.@operand` (mode structuré). À implémenter : le parser doit accepter `#42` uniquement ; la résolution par nom est une affaire du **mode guidé** (l'éditeur convertit `nomCommune` ↔ `#3`).

**Mot-clé spécial** : `now` (date courante), utilisé sans `#` : `year(now) - 1`. À traiter comme un identifiant réservé.

**Référence implicite à attribut** : `dynamic = 0` (sans `#`) cible l'attribut `Simulator.@dynamic`. Observé dans `forfaits` R16/R17. À considérer comme un **alias d'identifiant de contexte**, pas une primitive — pourrait être modélisé comme un Data système préfixé `$dynamic`.

## 3. Opérateurs

### 3.1 Arithmétiques (présents dans `content`, `default`, `value`)

`+`, `-`, `*`, `/`, parenthèses `()`. Précédence et associativité **standard** (multiplication avant addition). Exemples :

```
#10 - #18
(#4 * 200)
#12 + #14
floor(#16 / 1000) * 1350           (équivalent reconstruit, cf. forfaits)
((#102 - #105) / #102) * 100
(#19 - (#15 - 1)) * #13
```

L'opérateur `+` est aussi un **concaténateur de chaînes** : `'1/' + #9 + '/' + #10`. Coercion implicite int→string.

### 3.2 Comparaison (présents dans `Conditions/@value` et `Condition` mode guidé)

`=`, `!=`, `<`, `<=`, `>`, `>=` — note : **`=` simple (et pas `==`)** dans G6K. Le parser doit accepter `=` en contexte booléen comme « égalité ».

Comptage corpus (`operator=` de Conditions) :
- `=` 112×, `<=` 70×, `>` 39×, `<` 23×, `>=` 15×, `!=` 4×
- `present` 272×, `blank` 51×, `isTrue` 15×, `isFalse` 21×

### 3.3 Logiques (présents dans `Conditions/@value` uniquement)

`&&` (ET), `||` (OU), `!` (NON). Toujours échappés en `&amp;&amp;` dans le XML.

Exemple : `defined(#1) && defined(#5) && defined(#3) && (#7 = 1 || #6 = 1)`

⚠️ **En mode structuré, ces opérateurs sont remplacés par les `Connector type="all"|"any"|"none"`.** La grammaire textuelle n'utilise pas `none` — c'est `!(any(…))` qui en est l'équivalent.

### 3.4 Opérateurs « G6K-spécifiques » (mode structuré uniquement)

- `present` : équivalent à `defined(#X) && #X != ''`
- `blank` : opposé de `present`
- `isTrue` / `isFalse` : test booléen explicite

Ces opérateurs n'apparaissent **jamais comme tokens** dans les expressions textuelles `@value` (qui utilisent `defined(...)` à la place). Ils n'existent que dans `Condition.@operator` (vue structurée).

### 3.5 Pas d'opérateurs ternaire / boucles / récursion

Aucun `? :`, aucun `for`/`while`, aucune définition de fonction utilisateur. Le calcul est strictement déclaratif via les `content` + propagation réactive.

## 4. Fonctions

### 4.1 Fonctions standard (registre engine)

Identifiées par survol exhaustif du corpus :

| Fonction | Signature observée | Occurrences |
|---|---|---|
| `defined(x)` | `defined(#3)` → booléen | 323× (omniprésent dans Conditions) |
| `year(date \| 'now')` | `year(#8)`, `year(now)` → integer | 49× |
| `floor(x)` | `floor(#16 / (#36 + #46))` → integer | 14× |
| `sum(a, b, …)` | `sum(#1, #2 * 8, #4, #5 * 3, #7, #8)` → number (somme variadique avec expressions par arg) | 5× |
| `max(a, b, …)` | `max(#5, #6)` → number | 1× |
| `count(…)` | usage isolé à confirmer | 1× |
| `strftime(format, date)` | `strftime('%Y', finPeriode)` → string. Échappé en `%%Y` dans le SQL. **Vu uniquement côté SQL des `Source.request`**, pas dans une expression engine. | 14× (toutes en SQL) |

⚠️ **`min()` et `round()` ne sont PAS dans le corpus** — ne pas les ajouter au registre MVP sans demande. Le `round` du DataSet est un **attribut d'arrondi d'affichage** (`Data.@round`), pas une fonction d'expression.

### 4.2 Fonctions métier (registre `packages/functions`)

| Fonction | Signature observée | Usage |
|---|---|---|
| `workdaysofmonth(month, year)` | `workdaysofmonth(#10, #9)` → integer (nb de jours ouvrables) | `gratification-stagiaire` (12× — un par mois) |
| `getInsee(commune)` | `getInsee(#1)` → string (code INSEE) | `taxeLogementsVacants` R2 |
| `getNomVille(commune)` | `getNomVille(#1)` → string | `taxeLogementsVacants` R2 |

Tableau extrait du corpus ; pas d'autres fonctions métier. La fonction `tableLookup(table, key, value, …)` proposée dans `_corpus/targets.md` pour les portail-elec est une **extension future**.

### 4.3 Pas de méthodes / accès aux propriétés

Aucun pattern `obj.field` ni `obj[key]`. Tout est plat : un `Data` = un scalaire (les sources `assocArray` sont résolues via `Data.@index="'colonne'"` au niveau XML, pas par accès d'objet dans l'expression).

## 5. Précédence et associativité

Comme **JavaScript standard**, ce qui est cohérent avec un parsing via `jsep` :

1. `()` (groupage)
2. `!` (unaire)
3. `*` `/`
4. `+` `-`
5. `<` `<=` `>` `>=`
6. `=` `!=`
7. `&&`
8. `||`

Associativité gauche pour tous les binaires.

## 6. Exemples du corpus décortiqués

### 6.1 Visibilité avec préconditions

```
defined(#3) && defined(#2) && #2 = 0
```

AST : `AND(AND(defined(#3), defined(#2)), eq(#2, 0))` — `(defined(#3))` est élevé en racine logique commune, le `eq(#2, 0)` discrimine la branche.

### 6.2 Calcul arithmétique avec sous-expression

```
(#19 - (#15 - 1)) * #13
```

= « (poidsRetenu − (trancheDebut − 1)) × prixAuKg ». AST : `mul(sub(#19, sub(#15, 1)), #13)`. Parenthèses sémantiquement nécessaires.

### 6.3 Concaténation date

```
'1/' + #9 + '/' + #10
```

Construit `"1/<mois>/<année>"` (format `d/m/Y`). AST : `concat('1/', #9, '/', #10)` où `+` agit en concat. Cas limite : nécessite coercion `integer → string`.

### 6.4 Comparaison de date

```
#8 < 1/1/2024
```

Le littéral `1/1/2024` n'est pas trois divisions : il est reconnu comme **date** selon `DataSet.dateFormat`. Le parser doit donc soit (a) tokeniser les dates au lexer, soit (b) injecter la conversion via le type des opérandes. **Solution probable** : représenter en AST comme `date('1/1/2024')` et laisser l'évaluateur typer dynamiquement.

### 6.5 Combinaison logique avec OR groupé

```
defined(#1) && (#7 = 1 || #6 = 1)
```

AST : `AND(defined(#1), OR(eq(#7,1), eq(#6,1)))`. Mode structuré équivalent :

```xml
<Connector type="all">
  <Condition operand="commune" operator="present"/>
  <Connector type="any">
    <Condition operand="RecevableDesequilibre" operator="=" expression="1"/>
    <Condition operand="RecevablePlus50000" operator="=" expression="1"/>
  </Connector>
</Connector>
```

## 7. Points d'ambiguïté à trancher en phase 2

1. **Coercion implicite** : `'1/' + #9 + '/' + #10` confirme que `+` est polymorphe. À spécifier formellement : si l'un des opérandes est string, on concatène ; sinon on additionne. Risque de bugs si on oublie de typer.
2. **Tokenisation des dates littérales** : `1/1/2024` est syntaxiquement ambigu avec `1/(1/2024)`. Convention à figer dans le grammar (jsep custom).
3. **`#21` (booléen) en contexte logique** : `dynamic = 1 && !#21` traite `#21` comme booléen directement. À documenter : tout identifiant en contexte booléen est testé en truthiness.
4. **Sémantique précise de `now`** : timestamp à quelle granularité ? L'heure ? Le timezone est `Europe/Paris` (`Simulator.@timezone`). Probable : date du jour à minuit.
