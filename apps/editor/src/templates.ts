import type { Simulator } from "@g6k4ever/schema";

/**
 * Template vierge pour créer un nouveau simulateur depuis l'éditeur. L'utilisateur
 * peut ensuite personnaliser à sa guise.
 *
 * Le slug `metadata.name` sera modifié à la création pour devenir unique.
 */
export function createBlankSimulator(slug: string, label: string): Simulator {
  return {
    schemaVersion: 1,
    metadata: {
      name: slug,
      label,
      description: "",
      defaultLocale: "fr-FR",
      dateFormat: "dd/MM/yyyy",
      authors: [],
    },
    outputKind: "decision",
    data: [
      {
        id: 1,
        name: "exemple",
        label: "Donnée d'exemple",
        type: "text",
      },
    ],
    sources: [],
    steps: [
      {
        id: 1,
        name: "step1",
        label: "Première étape",
        blocks: [
          {
            id: "field-exemple",
            type: "field",
            config: {
              dataId: 1,
              dataName: "exemple",
              dataType: "text",
              label: "Donnée d'exemple",
              required: false,
            },
          },
        ],
      },
    ],
    rules: [],
    footnotes: [],
  };
}
