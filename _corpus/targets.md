# Corpus — cibles fonctionnelles et capacités requises

> Issu de l'audit du 2026-05-28 sur les 5 simulateurs `portail-elec` et les 5 simulateurs `g6k/`. Cette note est **la spec d'acceptation du MVP**.

## 1. Synthèse — verdict de couverture

**Le périmètre fonctionnel G6K (cf. `CLAUDE.md` §7) suffit à reproduire les simulateurs portail-elec.** Aucune nouvelle primitive du schéma n'est nécessaire. Les extensions passent par les mécanismes déjà prévus (registres extensibles : blocs DSFR, fonctions métier).

## 2. Cibles portail-elec — fiche par simulateur

### `voiture.html` — TCO VE vs thermique ✅ MVP

- **Type** : Calcul TCO + mode guidé/expert switchable
- **Champs** : `km` (number), `duree` (integer ans), `ve_prix` / `th_prix` (money), `ve_conso` / `th_conso` (number), `rfr` (choice → bonus barème), `surbonus` (money), `pkwh_hc` / `pessence` (number), `dec_ve` / `dec_th` (percent)
- **Calculs** : Acquisition = prix + borne − prime(RFR, surbonus) ; Usage = (km/100 × conso × tarif) × N ; TCO = Acq + Usage − Résiduel ; Écart = TCO_TH − TCO_VE
- **Rendu** : Story-steps conditionnels (showObject), tableau de composantes, graphique TCO cumulé (→ **dégradé en tableau pour MVP**)
- **Datasources** : Inline (tarifs, barème bonus par RFR, dépréciations)

### `changer-de-classe.html` — Capacité d'emprunt ✅ MVP

- **Type** : Calcul financier inverse (capacité d'emprunt depuis économies mensuelles)
- **Champs** : 9 sliders (`range` = variant number) — km, conso, fuel, bonus, months, rate, evconso, elec, maint
- **Calculs** : Économie mensuelle ; Capacité d'emprunt = PV(éco_mens, taux, durée_mois) ; Capital = Capacité + Bonus
- **Rendu** : KPI hero, 5 accordéons DSFR conditionnels (paliers de surclassement avec exemples de modèles), breakdown mensuel
- **Datasources** : Inline (paliers fixes)
- **Capacité requise nouvelle** : bloc `accordion` avec `condition` par item

### `poids-lourd.html` — TCO B2B ⚠️ MVP partiel

- **Type** : Calcul TCO B2B (identique en logique à `voiture`)
- **Champs** : 8 champs (prix VE/diesel, maint VE/diesel, km, durée, conso, tarifs, aide ≤100k€)
- **Calculs** : TCO_diesel et TCO_elec, aide forfaitaire fixe
- **Rendu** : KPI + **2 charts.js** (TCO cumulé, pivot km/an de rentabilité) → **reportés v1.1**, MVP en tableaux
- **Datasources** : Inline

### `passer-a-electrique.html` — Synthèse multi-domaine ⚠️ MVP partiel

- **Type** : Calcul orchestré sur 3 domaines (mobilité, logement, solaire) + arbre de décision guidé
- **Champs** : `personnes` (range), `surface` (range), `dpe` / `energie` (choice), `km` (range), `carbu` (choice), `horizon` (range 15-25), `azimut` / `puissance` (optionnels solaire)
- **Calculs** : `calcMobilite` + `calcLogement` + `calcSolaire` + cumul amortissement
- **Rendu** : Radio tiles, KPI cards, sections tabbed conditionnelles, courbe amortissement (→ **tableau MVP**)
- **Datasources** : Inline (barèmes MaPrimeRénov', CEE, économies par équipement) + **partner-offers.json** (post-MVP — schéma draft)
- **Capacité requise nouvelle** : structure de calculs orchestrée (mais reste de l'arithmétique + règles, pas de primitive nouvelle)

### `pompe-a-chaleur.html` — PAC après aides ❌ Post-MVP

- **Type** : Calcul mono-projet + amortissement
- **Champs** : `surface` (range), `zone` (choice), `isolation` (choice), `energie` (choice), `facture-montant` (money optionnel)
- **Calculs** : Besoin utile = f(surface, isolation, zone, énergie) ; Aides = max(MaPrimeRénov, CEE…) plafonnées ; Amortissement annuel
- **Rendu** : KPI + **3 charts.js** (amortissement, TCO comparé par énergie) → bloquant pour MVP
- **Datasources** : Inline (coefficients besoin utile par zone × isolation, barèmes MaPrimeRénov' par RFR × région)
- **Reporté v1.1** : Lookup barème multi-dimensionnel + primitive `chart`

## 3. Capacités requises pour le MVP

### ✅ Déjà dans le périmètre G6K

| Capacité | Mécanisme |
|---|---|
| Champs typés (11 types) | Schéma Zod |
| Conditions imbriquées all/any/none + 10 opérateurs | Schéma + engine |
| Actions show/hide, set/unset, notify | Engine |
| Arithmétique + fonctions registre | Engine + `packages/functions` |
| Datasources inline éditables | `packages/schema` + résolveur |
| Texte riche à variables (`#var`) conditionné | `packages/blocks` (text bloc) |
| Sections conditionnelles | `packages/blocks` (section bloc) |
| Mode guidé / mode expert | Éditeur (deux vues d'une même donnée) |

### 🆕 Extensions à prévoir (via les mécanismes existants — **pas de primitive de schéma nouvelle**)

| Extension | Type | Détail |
|---|---|---|
| `range` (slider) | Variant UI du type `number` | Props `min`, `max`, `step`. Pas une nouvelle primitive — c'est juste un hint de rendu pour `number`. |
| Bloc `accordion` conditionnel | Nouveau bloc DSFR | Liste d'items, chacun avec `condition` (réutilise les règles existantes). Implémenté dans `packages/blocks`. |
| Bloc `kpi-card` | Nouveau bloc DSFR | Affiche une valeur calculée + label + tendance. Standard dans tous les simulateurs portail-elec. |
| Bloc `breakdown-table` | Nouveau bloc DSFR | Tableau de décomposition (composantes d'un calcul). |
| Fonction `tableLookup(table, key, value, conditions)` | Nouvelle fonction métier | Lookup dans un barème indexé. Implémentée dans `packages/functions`. Couvre bonus écologique par RFR, MaPrimeRénov par tranche, etc. |
| Fonction `pv(rate, periods, payment)` | Nouvelle fonction métier | Valeur actuelle d'une annuité — pour `changer-de-classe`. |
| Fonction `cumulativeSum(value, years)` | Nouvelle fonction métier | Cumul annuel borné — utile pour amortissements et TCO. |

### ❌ Reporté post-MVP (v1.1)

| Capacité | Pourquoi reportée | Simulateurs concernés |
|---|---|---|
| Primitive `chart` (line, bar, pie) + bloc DSFR | Spécifier proprement l'API (data, axes, séries, légende) demande son propre design ; Chart.js ajoute du poids au bundle runtime | poids-lourd, pompe-a-chaleur, voiture, passer-a-electrique |
| Cartes interactives (Leaflet) | Hors des 5 simu auditées (bornes-ve et territoires-electrification non audités) | bornes-ve, territoires-electrification |
| **Groupe répétable** | Déjà prévu au schéma, pas implémenté MVP | forfaits, gratification-stagiaire (G6K) |
| Datasource `partner-offers.json` | Schéma encore en draft chez portail-elec | passer-a-electrique, pompe-a-chaleur, changer-de-classe |
| Export PDF / CERFA | Hors MVP (cf. plan §6) | aucun des 5 — à venir |

## 4. Critères d'acceptation du MVP

Le MVP est *fini* quand :

1. **`frais-locataire.xml`** (G6K) est reproductible à l'identique côté runtime, sans modifier le moteur après les golden tests.
2. **`taxeLogementsVacants.xml`** (G6K) est reproductible à l'identique, et **recréable de zéro depuis l'éditeur no-code** (preuve que l'éditeur est utilisable par un contributeur).
3. **`voiture.html`** (portail-elec) est reproductible côté runtime avec son tableau de composantes et son mode guidé ⇄ expert, le graphe TCO étant dégradé en tableau de valeurs par année.
4. **`changer-de-classe.html`** (portail-elec) est reproductible avec ses 9 sliders, ses 5 accordéons conditionnels et le calcul de capacité d'emprunt.

## 5. Critères d'acceptation v1.1

5. **`poids-lourd.html`** reproductible **avec** ses 2 graphes (= primitive `chart` livrée).
6. **`gratification-stagiaire.xml`** reproductible (= groupe répétable livré).

## 6. Hors périmètre

7. Cartes interactives, export PDF/CERFA, lettres guidées, import G6K existant. Sur feu vert explicite uniquement.
