# Corpus — spec vivante de g6k4ever

> Ce dossier **est la spec**. Toute primitive du schéma, toute fonction du registre, tout bloc DSFR doit être justifié par au moins un simulateur d'ici. Le corpus sert de critère d'acceptation : une feature est *finie* quand un simulateur du corpus est reproductible à l'identique.

## Organisation

```
_corpus/
├── g6k/                     → 5 simulateurs G6K (XML) + XSD — référence historique exhaustive
├── portail-elec/            → 5 simulateurs réels (HTML/JS) — cibles à reproduire
└── targets.md               → analyse fonctionnelle, ce qui rentre dans le MVP et ce qui sort
```

## Source des fichiers

### `g6k/` (XML — référence G6K)

Extraits curés de [`G6K-examples-data-legacy/definitions-des-simulateurs/`](../G6K-examples-data-legacy/definitions-des-simulateurs/) :

| Fichier | Type | Pourquoi dans le corpus |
|---|---|---|
| `frais-locataire.xml` | Calcul + arbre de décision | Cas représentatif minimal : 5 champs, ~10 règles, zonage textuel conditionnel. **Test d'acceptation MVP prioritaire.** |
| `taxeLogementsVacants.xml` | Calcul | Datasource SQL (`getInsee`), texte riche à variables, sections conditionnelles. **Second test d'acceptation MVP.** |
| `forfaits.xml` | Calcul (1231 lignes) | Stress-test : duplication de logique par tranche → motive le futur **groupe répétable** (post-MVP). |
| `TaxeAuPoids.xml` | Calcul | Arithmétique complexe + barèmes inline éditables. |
| `gratification-stagiaire.xml` | Calcul (1990 lignes) | Cas extrême de duplication (12× `workdaysofmonth`). Confirme le besoin de groupe répétable post-MVP. |
| `Simulator.xsd` | Schéma XML d'origine | Référence pour le mapping vers le schéma Zod. |

### `portail-elec/` (HTML/JS — cibles réelles)

Copies des `index.html` de [`simulateurs-portail-elec`](../../simulateurs-portail-elec/) :

| Fichier | Type | Statut MVP |
|---|---|---|
| `voiture.html` | TCO VE vs thermique | ✅ MVP — graphe simplifié en tableau si pas de primitive `chart` |
| `changer-de-classe.html` | Fact-checker / capacité d'emprunt | ✅ MVP — bon test sliders + paliers conditionnels |
| `poids-lourd.html` | TCO B2B | ⚠️ MVP partiel — calculs OK, graphes reportés v1.1 |
| `passer-a-electrique.html` | Synthèse multi-domaine (mobilité + logement + solaire) | ⚠️ MVP partiel — sans offres partenaires (encore en draft) |
| `pompe-a-chaleur.html` | Coût PAC après aides | ❌ Post-MVP — dépend de Chart.js + lookup barème complexe |

## À retenir

- **Le périmètre G6K (cf. `CLAUDE.md` §7) suffit à reproduire la logique métier** des simulateurs portail-elec. Aucune nouvelle primitive de schéma n'est requise.
- Les extensions nécessaires se font via les mécanismes **déjà prévus** :
  - Nouveau type de champ `range` (slider) = variant UI de `number` (props `min`/`max`/`step`).
  - Bloc `accordion` avec `condition` par item = nouveau bloc DSFR au registre.
  - Lookup de barème (`tableLookup`) = nouvelle fonction métier au registre.
- **Hors MVP** : graphes Chart.js (primitive `chart` à concevoir en v1.1), cartes Leaflet, offres partenaires.

Voir [`targets.md`](./targets.md) pour le détail simulateur par simulateur et la liste exhaustive des capacités requises.
