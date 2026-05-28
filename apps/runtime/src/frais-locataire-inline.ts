import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";

/**
 * Variante de `frais-locataire` avec datasource `inline` — exploitable
 * directement côté client (sans appel API). Le corpus G6K original utilise
 * une source `database` SQL qui nécessite l'API.
 *
 * On passe par `safeParse` au chargement pour bénéficier des `default([])` Zod
 * (elseActions, parameters, etc.) tout en gardant le littéral lisible.
 */
const raw = {
  schemaVersion: 1,
  metadata: {
    name: "frais-locataire",
    label: "Frais de mise en location imputables au locataire",
    description:
      "Permet de connaître la zone géographique dont dépend le logement et le prix maximum par m² des frais d'agence imputables au locataire.",
    authors: ["DGCCRF / G6K"],
  },
  outputKind: "decision",
  data: [
    { id: 1, name: "commune", label: "Code INSEE de la commune", type: "text" },
    {
      id: 2,
      name: "frais",
      label: "Code zone",
      type: "integer",
      source: { sourceId: "zonage", returnPath: "frais" },
    },
    {
      id: 3,
      name: "nomCommune",
      label: "Nom de la commune",
      type: "text",
      source: { sourceId: "zonage", returnPath: "commune" },
    },
  ],
  sources: [
    {
      kind: "inline",
      id: "zonage",
      label: "Zonage des communes (extrait pour démo)",
      columns: [
        { name: "insee", type: "text" },
        { name: "commune", type: "text" },
        { name: "frais", type: "integer" },
      ],
      rows: [
        { insee: "75056", commune: "Paris", frais: 2 },
        { insee: "13055", commune: "Marseille", frais: 1 },
        { insee: "69123", commune: "Lyon", frais: 1 },
        { insee: "33063", commune: "Bordeaux", frais: 1 },
        { insee: "35238", commune: "Rennes", frais: 1 },
        { insee: "31555", commune: "Toulouse", frais: 1 },
        { insee: "06088", commune: "Nice", frais: 2 },
        { insee: "44109", commune: "Nantes", frais: 1 },
        { insee: "48095", commune: "Mende", frais: 0 },
        { insee: "15014", commune: "Aurillac", frais: 0 },
        { insee: "03190", commune: "Moulins", frais: 0 },
        { insee: "23096", commune: "Guéret", frais: 0 },
      ],
      parameters: [{ name: "insee", type: "text", position: 1, bindToDataId: 1 }],
    },
  ],
  steps: [
    {
      id: 1,
      name: "zonage",
      label: "Vérifier le zonage de votre commune",
      blocks: [
        {
          id: "field-commune",
          type: "field",
          config: {
            dataId: 1,
            dataName: "commune",
            dataType: "text",
            label: "Code INSEE de la commune",
            hint: "5 chiffres — ex. 75056 pour Paris, 35238 pour Rennes, 48095 pour Mende",
            required: true,
          },
        },
        {
          id: "blockinfo-resultats",
          type: "blockinfo",
          config: {
            blocks: [
              {
                id: "section-zone-0",
                type: "text-section",
                config: {
                  variant: "default",
                  title: "Reste du territoire",
                  content:
                    "#3 n'est pas en zone tendue.\n\nLe tarif maximum imputable au locataire est de **8 €** TTC par m² de surface habitable.\n\nExemple : pour un logement de 26,30 m², le montant ne doit pas dépasser **210,40 € TTC**.\n\n*Attention : ce montant ne doit pas non plus dépasser celui imputé au bailleur.*",
                },
              },
              {
                id: "section-zone-1",
                type: "text-section",
                config: {
                  variant: "info",
                  title: "Zone tendue",
                  content:
                    "#3 est en zone tendue.\n\nLe tarif maximum imputable au locataire est de **10 €** TTC par m² de surface habitable.\n\nExemple : pour un logement de 26,30 m², le montant ne doit pas dépasser **263 € TTC**.\n\n*Attention : ce montant ne doit pas non plus dépasser celui imputé au bailleur.*",
                },
              },
              {
                id: "section-zone-2",
                type: "text-section",
                config: {
                  variant: "warning",
                  title: "Zone très tendue",
                  content:
                    "#3 est en zone très tendue.\n\nLe tarif maximum imputable au locataire est de **12 €** TTC par m² de surface habitable.\n\nExemple : pour un logement de 26,30 m², le montant ne doit pas dépasser **315,16 € TTC**.\n\n*Attention : ce montant ne doit pas non plus dépasser celui imputé au bailleur.*",
                },
              },
            ],
          },
        },
      ],
    },
  ],
  rules: [
    {
      id: "R1",
      name: "Affiche le résultat quand le zonage est résolu",
      conditions: {
        kind: "connector",
        type: "all",
        children: [
          { kind: "condition", operand: 3, operator: "present" },
          { kind: "condition", operand: 2, operator: "present" },
        ],
      },
      ifActions: [
        { kind: "showObject", target: { type: "blockinfo", id: "blockinfo-resultats" } },
      ],
      elseActions: [
        { kind: "hideObject", target: { type: "blockinfo", id: "blockinfo-resultats" } },
      ],
    },
    {
      id: "R2",
      name: "Zone non tendue (frais = 0)",
      conditions: {
        kind: "connector",
        type: "all",
        children: [
          { kind: "condition", operand: 3, operator: "present" },
          { kind: "condition", operand: 2, operator: "present" },
          { kind: "condition", operand: 2, operator: "=", value: "0" },
        ],
      },
      ifActions: [
        { kind: "showObject", target: { type: "section", id: "section-zone-0" } },
        { kind: "hideObject", target: { type: "section", id: "section-zone-1" } },
        { kind: "hideObject", target: { type: "section", id: "section-zone-2" } },
      ],
    },
    {
      id: "R3",
      name: "Zone tendue (frais = 1)",
      conditions: {
        kind: "connector",
        type: "all",
        children: [
          { kind: "condition", operand: 3, operator: "present" },
          { kind: "condition", operand: 2, operator: "present" },
          { kind: "condition", operand: 2, operator: "=", value: "1" },
        ],
      },
      ifActions: [
        { kind: "showObject", target: { type: "section", id: "section-zone-1" } },
        { kind: "hideObject", target: { type: "section", id: "section-zone-0" } },
        { kind: "hideObject", target: { type: "section", id: "section-zone-2" } },
      ],
    },
    {
      id: "R4",
      name: "Zone très tendue (frais = 2)",
      conditions: {
        kind: "connector",
        type: "all",
        children: [
          { kind: "condition", operand: 3, operator: "present" },
          { kind: "condition", operand: 2, operator: "present" },
          { kind: "condition", operand: 2, operator: "=", value: "2" },
        ],
      },
      ifActions: [
        { kind: "showObject", target: { type: "section", id: "section-zone-2" } },
        { kind: "hideObject", target: { type: "section", id: "section-zone-0" } },
        { kind: "hideObject", target: { type: "section", id: "section-zone-1" } },
      ],
    },
  ],
};

const parsed = SimulatorSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error(
    `frais-locataire-inline est invalide vis-à-vis du schéma : ${JSON.stringify(parsed.error.format(), null, 2)}`,
  );
}

export const fraisLocataireInline: Simulator = parsed.data;
