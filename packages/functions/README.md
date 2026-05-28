# @g6k4ever/functions

**Registre de fonctions** appelables depuis les expressions des simulateurs.

> 📌 Implémenté en **Phase 3** (en parallèle de l'engine). Voir [`ROADMAP.md`](../../ROADMAP.md).

## Fonctions standard (fournies)

`defined`, `sum`, `floor`, `max`, `min`, `count`, `year`, `strftime` — celles relevées dans le corpus G6K.

## Fonctions métier (injectables)

Les développeurs enregistrent leurs fonctions via `registerFunction(name, signature, impl)`. Le moteur ne les connaît que par leur nom.

Exemples du corpus G6K : `workdaysofmonth`, `getInsee`, `getNomVille`.
Exemples portail-elec attendus : `tableLookup(table, key, value, conditions)`, `pv(rate, periods, payment)`, `cumulativeSum(value, years)`.
