// Génère _corpus/g6k/gratification-stagiaire.json depuis le périmètre simplifié
// du simulateur G6K legacy (gratification-stagiaire.xml, 148 Data, 14 Sources DB).
//
// **Pourquoi simplifié** : le legacy déclare 14 sources SQL distinctes (1 par
// mois + 1 sur la période globale) qui résolvent le plafond horaire sécurité
// sociale selon la date. Pour la **preuve d'usage du RepeatableGroup** (Phase
// 8c), on remplace ces résolutions DB par une seule Data top-level
// `plafondHoraire` saisissable, pré-remplie à la valeur 2024 (3925 / 151,67 ≈
// 25,87 €/h pour le plafond mensuel ; en pratique on prend 29 € pour
// arrondir et matcher le taux minimum légal de 15 % → ~4,35 €/h).
//
// Modèle :
//   - 5 Data top-level (taux, plafond, gratifMinHeure dérivée, totalNbHeures
//     dérivée, totalGratification dérivée)
//   - 1 RepeatableGroup `moisStage` × 12 itérations × 4 templates (mois,
//     annee, nbHeures, gratifMois)
//   - 2 steps (saisie multi-mois + récap)
//   - 1 KPI (totalGratification) + 1 breakdown-table (par mois)
//   - 0 source : tout est inline
//
// Lancer : `node tools/build-gratification-stagiaire.mjs`

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "_corpus/g6k/gratification-stagiaire.json");

const SCHEMA_VERSION = 1;

// ----------------------------------------------------------------------------
// Data top-level
// ----------------------------------------------------------------------------

const DATA_TAUX = 1;
const DATA_PLAFOND = 2;
const DATA_GRATIF_MIN_HEURE = 3;
const DATA_TOTAL_HEURES = 4;
const DATA_TOTAL_GRATIF = 5;
const DATA_NB_MOIS = 6;

const ITERATIONS = 12;
const BASE = 100;
const STRIDE = 10;

const data = [
  {
    id: DATA_TAUX,
    name: "tauxMinimal",
    label: "Taux minimum légal (% du plafond horaire de la sécurité sociale)",
    type: "percent",
    default: "0.15",
    description:
      "Fixé par décret. Modifiable si une convention de branche prévoit un taux supérieur.",
  },
  {
    id: DATA_PLAFOND,
    name: "plafondHoraire",
    label: "Plafond horaire de la sécurité sociale (€/h)",
    type: "money",
    default: "29",
    description:
      "Plafond mensuel 2024 ≈ 3 925 € / 151,67 h ≈ 25,87 €/h. Saisi librement, le taux retenu (15 %) donne 4,35 €/h.",
  },
  {
    id: DATA_GRATIF_MIN_HEURE,
    name: "gratifMinHeure",
    label: "Gratification minimale par heure (€/h)",
    type: "money",
    content: `#${DATA_TAUX} * #${DATA_PLAFOND}`,
  },
  {
    id: DATA_TOTAL_HEURES,
    name: "totalHeures",
    label: "Total des heures effectuées",
    type: "number",
    // sum des nbHeures de chaque mois (idOffset=2 dans le groupe)
    content: `sum(${Array.from(
      { length: ITERATIONS },
      (_, i) => `#${BASE + i * STRIDE + 2}`,
    ).join(", ")})`,
  },
  {
    id: DATA_TOTAL_GRATIF,
    name: "totalGratification",
    label: "Gratification totale due au stagiaire (€)",
    type: "money",
    // sum des gratifMois de chaque mois (idOffset=3 dans le groupe)
    content: `sum(${Array.from(
      { length: ITERATIONS },
      (_, i) => `#${BASE + i * STRIDE + 3}`,
    ).join(", ")})`,
  },
  {
    id: DATA_NB_MOIS,
    name: "nbMoisNonVides",
    label: "Nombre de mois renseignés",
    type: "integer",
    // count des nbHeures > 0
    content: `count(${Array.from(
      { length: ITERATIONS },
      (_, i) => `#${BASE + i * STRIDE + 2}`,
    ).join(", ")})`,
  },
];

// ----------------------------------------------------------------------------
// RepeatableGroup
// ----------------------------------------------------------------------------

const groups = [
  {
    id: "moisStage",
    label: "Mois du stage",
    iterations: ITERATIONS,
    startIndex: 1,
    dataIdBase: BASE,
    dataIdStride: STRIDE,
    dataTemplates: [
      {
        idOffset: 0,
        name: "mois{i}",
        label: "Mois {i}",
        type: "month",
      },
      {
        idOffset: 1,
        name: "annee{i}",
        label: "Année {i}",
        type: "year",
        default: "2024",
      },
      {
        idOffset: 2,
        name: "nbHeures{i}",
        label: "Heures effectuées au mois {i}",
        type: "number",
        min: "0",
        max: "250",
      },
      {
        idOffset: 3,
        name: "gratifMois{i}",
        label: "Gratification due au mois {i} (€)",
        type: "money",
        // {i*10+92} = nbHeures à cette itération ; #3 = gratifMinHeure top-level
        content: `#{i*10+92} * #${DATA_GRATIF_MIN_HEURE}`,
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// Steps + blocks
// ----------------------------------------------------------------------------

const monthFieldBlocks = [];
for (let i = 0; i < ITERATIONS; i++) {
  const idx = i + 1;
  const nbHeuresId = BASE + i * STRIDE + 2;
  monthFieldBlocks.push({
    id: `chap-mois-${idx}`,
    type: "chapter",
    config: {
      title: `Mois ${idx}`,
      blocks: [
        {
          id: `field-nbHeures-${idx}`,
          type: "field",
          config: {
            dataId: nbHeuresId,
            dataName: `nbHeures${idx}`,
            dataType: "number",
            label: `Heures effectuées au mois ${idx}`,
            required: idx === 1,
          },
        },
      ],
    },
  });
}

const steps = [
  {
    id: 1,
    name: "parametres",
    label: "Paramètres légaux",
    description:
      "Taux minimum et plafond horaire de la sécurité sociale — valeurs pré-remplies modifiables.",
    blocks: [
      {
        id: "field-taux",
        type: "field",
        config: {
          dataId: DATA_TAUX,
          dataName: "tauxMinimal",
          dataType: "percent",
          label: "Taux minimum légal (% du plafond)",
          required: true,
        },
      },
      {
        id: "field-plafond",
        type: "field",
        config: {
          dataId: DATA_PLAFOND,
          dataName: "plafondHoraire",
          dataType: "money",
          label: "Plafond horaire SS (€/h)",
          required: true,
        },
      },
      {
        id: "txt-gratifMin",
        type: "text-section",
        config: {
          variant: "info",
          title: "Gratification minimale par heure",
          content:
            "Au taux et au plafond saisis ci-dessus, la gratification minimale légale s'élève à **#3 €/h** (= taux × plafond).",
        },
      },
    ],
  },
  {
    id: 2,
    name: "saisieMois",
    label: "Heures effectuées par mois",
    description:
      "Saisissez les heures travaillées chaque mois (laissez à 0 les mois où le stagiaire n'a pas travaillé).",
    blocks: monthFieldBlocks,
  },
  {
    id: 3,
    name: "resultat",
    label: "Gratification totale",
    description: "Récapitulatif mois par mois et total dû au stagiaire.",
    blocks: [
      {
        id: "kpi-total",
        type: "kpi-card",
        config: {
          label: "Gratification totale due (€)",
          dataId: DATA_TOTAL_GRATIF,
          format: "money",
          variant: "highlight",
          hint: "Somme des gratifications dues chaque mois travaillé.",
        },
      },
      {
        id: "kpi-heures",
        type: "kpi-card",
        config: {
          label: "Total des heures effectuées",
          dataId: DATA_TOTAL_HEURES,
          format: "raw",
          hint: "Cumul sur tous les mois renseignés.",
        },
      },
      {
        id: "breakdown-mois",
        type: "breakdown-table",
        config: {
          title: "Détail par mois",
          rows: Array.from({ length: ITERATIONS }, (_, i) => ({
            label: `Mois ${i + 1}`,
            dataId: BASE + i * STRIDE + 3, // gratifMois
            format: "money",
          })),
        },
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// Assembly
// ----------------------------------------------------------------------------

const simulator = {
  schemaVersion: SCHEMA_VERSION,
  metadata: {
    name: "gratification-stagiaire",
    label: "Gratification d'un stagiaire",
    description:
      "Calcule la gratification minimale légale due à un stagiaire sur une période de 1 à 12 mois. Reproduit le périmètre du simulateur G6K legacy (12 DataGroups identiques) via la primitive RepeatableGroup — preuve d'usage du schéma Phase 8c. La résolution du plafond horaire par mois via SQL est simplifiée en une saisie unique top-level.",
    defaultLocale: "fr-FR",
    dateFormat: "dd/MM/yyyy",
    authors: ["Service-public.fr (legacy G6K)", "g6k4ever — réécriture simplifiée"],
    navigation: "stepper",
  },
  outputKind: "calcul",
  data,
  sources: [],
  steps,
  rules: [],
  footnotes: [],
  groups,
};

writeFileSync(OUT, JSON.stringify(simulator, null, 2) + "\n");

console.log(`✅ Generated ${OUT}`);
console.log(`   Data top-level : ${data.length}`);
console.log(`   Groups         : ${groups.length}`);
console.log(`   → après expand : ${data.length + groups[0].iterations * groups[0].dataTemplates.length} Data`);
console.log(`   Steps          : ${steps.length}`);
