# Décisions de Phase 1 — résolution des questions ouvertes

> Compagnon de [`g6k-model.md`](./g6k-model.md), [`expressions-grammar.md`](./expressions-grammar.md), [`corpus-patterns.md`](./corpus-patterns.md), [`guided-vs-expert.md`](./guided-vs-expert.md). Ces 3 décisions tranchent les 3 questions ouvertes remontées par l'agent `analyst` afin de ne pas bloquer la Phase 2.

## D1 — Ordre d'évaluation des `BusinessRule` : fixed-point avec ordre XML comme tie-breaker

**Question** : l'ordre XML des `BusinessRule` est-il sémantiquement significatif (pile de visibilités où la dernière règle gagne) ou les règles doivent-elles converger en point fixe ?

**Décision** : **fixed-point**.

Le moteur évalue les règles en boucle jusqu'à stabilisation (l'état après l'itération `n+1` est identique à celui après `n`), avec un plafond configurable (défaut **10 itérations**). À l'intérieur d'une itération, les règles sont évaluées **dans l'ordre XML**, ce qui rend l'ordre déterministe pour les actions intrinsèquement non commutatives :

- `setAttribute target="content"` : si plusieurs règles d'une même itération affectent la même donnée, **la dernière dans l'ordre XML écrase les précédentes**.
- `showObject` / `hideObject` : idempotents, l'ordre ne change rien.
- `notifyError` / `notifyWarning` : accumulés dans une liste, l'ordre ne change que la position dans le rendu.

Si la propagation ne converge pas après N itérations, l'engine **lève une erreur** avec la liste des règles qui ont changé d'état au dernier tour (aide au débogage des cycles).

**Justification** :
- Cohérent avec la signature mentale `(définition, entrées, résolveurs) → (état stable)` posée dans `CLAUDE.md` §4 et l'ADR-028.
- Conforme au brief de l'agent `engine-dev` (`.claude/agents/engine-dev.md`) : « propagation jusqu'à stabilisation, max N itérations ».
- Évite de transformer la définition en script impératif ordonné — préserve le caractère **déclaratif** du modèle (les règles décrivent des contraintes, pas une séquence).
- Le pattern « 3 sections jumelles exclusives discriminées par `#2 = 0|1|2` » de `frais-locataire` se modélise naturellement par 3 règles indépendantes qui convergent en une seule itération.

**Implication pour le schéma** : aucune. Les `BusinessRule` restent une **liste ordonnée** (préserve l'ordre XML lu) mais l'engine ne s'appuie sur cet ordre qu'à titre de tie-breaker.

**Implication pour l'éditeur** : le power user peut réordonner les règles dans la trappe expert ; le mode guidé peut afficher l'ordre sans le mettre en exergue.

## D2 — Pas de littéraux date dans les expressions ; date = valeur typée

**Question** : comment tokeniser un littéral date comme `1/1/2024` dans `jsep` sans collision avec la division ?

**Décision** : **on n'introduit PAS de littéral date** dans la grammaire d'expressions.

Les **dates sont des valeurs typées** issues :
1. **des champs `date`/`month`/`year`** saisis par l'utilisateur (parsés au passage de la frontière selon `DataSet.@dateFormat`, sans toucher à la grammaire d'expression),
2. **du retour de fonctions** (`year(...)` retourne un nombre, `strftime(...)` une chaîne…),
3. **d'une chaîne ISO-8601 quotée** si un littéral est strictement nécessaire — convention de projet : `"2024-01-01"` parsée par la fonction `date("YYYY-MM-DD")` du registre.

**Justification** :
- Élimine intégralement l'ambiguïté `1/1/2024` vs `1/(1/2024)`.
- Aligne la grammaire d'expressions sur un **sous-ensemble strict de JavaScript** — `jsep` standard sans plugin date.
- Pas d'occurrence de littéral date dans les expressions du corpus G6K (vérifié : les dates apparaissent toujours comme valeurs de `#data` ou de fonctions).
- Préserve la **portabilité** entre les locales : `dd/MM/yyyy` (FR) ne devient pas une grammaire à part entière.

**Implication pour le schéma** : les fonctions `year`, `strftime`, `date` (à ajouter au registre standard) ont des signatures explicites avec types `date` / `number` / `string`.

**Implication pour l'éditeur** : en mode expert, l'auto-complétion propose `date("…")` quand le contexte attend une date littérale (rare). En mode guidé, le sélecteur de valeur affiche un date-picker.

## D3 — Connecteur `none` conservé, implémenté comme `!any(...)`

**Question** : le `Connector type="none"` apparaît au XSD G6K mais jamais à la racine dans le corpus. Le garde-t-on au schéma ou le retire-t-on du MVP en l'exprimant via `!(any(...))` côté expert ?

**Décision** : **on conserve `none`** dans le schéma.

Justifications :
- `CLAUDE.md` §7 du repo liste explicitement `all` / `any` / `none` comme les 3 connecteurs autorisés — décision déjà prise au moment de l'ADR-028.
- L'ADR-028 cite « **3 connecteurs** imbriquables » dans son inventaire des primitives.
- Le coût d'implémentation est nul : `evalNone(children, ctx) === !evalAny(children, ctx)`.
- Symétrie pour le mode guidé : trois cases « ET » / « OU » / « AUCUN », plus parlantes pour un contributeur non-dev qu'un opérateur de négation à appliquer à un autre groupe.

**Sémantique exacte** : `none(c1, c2, …, cn)` vaut `true` si **et seulement si** **tous** les `ci` sont `false`. Équivaut à `!any(c1, …, cn)` et à `all(!c1, …, !cn)`.

**Implication pour l'engine** : implémentation triviale, idéalement court-circuit dès qu'un enfant est vrai (retourne `false`).

**Implication pour le mode expert** : la trappe expert peut écrire indifféremment `none(c1, c2)` ou `!any(c1, c2)` ou `!(c1 || c2)`. Le mode guidé en sortie produit la forme structurée `Connector(type=none)`.

---

## Récapitulatif des primitives finales pour la Phase 2

Aucun changement de périmètre par rapport à `corpus-patterns.md` §6/§7 :

- **11 types de Data** : text, textarea, integer, number, money, percent, boolean, choice, date, month, year.
- **20 opérateurs** : 4 arithmétiques (`+`/`-`/`*`/`/`) + 6 comparaisons (`=`/`!=`/`<`/`<=`/`>`/`>=`) + 3 logiques (`&&`/`||`/`!`) + 4 spéciaux (`present`/`blank`/`isTrue`/`isFalse`) + 3 connecteurs (`all`/`any`/`none`).
- **6 fonctions standard** au registre `@g6k4ever/functions` : `defined`, `year`, `floor`, `sum`, `max`, `count` — auxquelles s'ajoutent **3 fonctions** déduites des décisions ci-dessus et utiles pour le corpus portail-elec (cf. `_corpus/targets.md`) : `date(iso)`, `strftime(date, fmt)`, `min` (symétrie avec `max`).
- **3 fonctions métier** injectables d'office : `workdaysofmonth`, `getInsee`, `getNomVille` (justifiées par le corpus G6K). Les fonctions du corpus portail-elec (`tableLookup`, `pv`, `cumulativeSum`) sont injectées par les développeurs au moment de leur usage.
- **6 actions** : `showObject`, `hideObject`, `setAttribute`, `unsetAttribute`, `notifyError`, `notifyWarning`.
- **12 cibles d'action** : voir `g6k-model.md` §Actions.
- **Référence des données** : `#<id>` uniforme (les noms ne servent qu'au sélecteur du mode guidé).

Hors MVP confirmé : `Profiles`, `Sites`, `multichoice`/`table`/`department`, `setAttribute` avec `target ≠ "content"`, `ChoiceGroup`, `Columns + FieldRow`, **groupe répétable** (motivé par `forfaits` et `gratification-stagiaire` mais reporté), **primitives graphes** (motivées par `poids-lourd`/`pompe-a-chaleur`), **export PDF/CERFA**.
