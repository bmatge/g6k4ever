# @g6k4ever/blocks

**Registre de blocs DSFR.** Une définition par bloc, consommée à la fois par le runtime (Phase 6) et par l'éditeur (Phase 7).

> 📌 **Phase 4 du plan.** L'interface canonique + le registre + 3 blocs de référence sont livrés. Les autres blocs du MVP s'ajouteront au fil du runtime et de l'éditeur. Cf. [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`blocks-dev`](../../.claude/agents/blocks-dev.md).

## Interface canonique

```ts
interface BlockDefinition<TConfig> {
  type: string;
  configSchema: z.ZodType<TConfig, z.ZodTypeDef, unknown>;
  editorMeta: { label: string; icon: string; group: string; description: string };
  readsDataIds: (config: TConfig) => number[];
  writesDataIds: (config: TConfig) => number[];
  render: ComponentType<BlockRenderProps<TConfig>>;
}
```

- `configSchema` : Zod validé par l'éditeur à la sauvegarde et par l'API à la persistance.
- `readsDataIds` / `writesDataIds` : utilisés par l'analyseur de cohérence de l'éditeur (« variable inexistante », « champ obligatoire jamais affiché », etc.).
- `render` : composant React qui reçoit `{ config, state }` et produit le DOM DSFR.

## Blocs déjà fournis (Phase 4)

| Type | Rôle | Lit | Écrit |
|---|---|---|---|
| `text-section` | Texte riche avec interpolation `#<id>`, callout DSFR optionnel | toutes les Data référencées par `#…` | — |
| `field` | Saisie utilisateur (11 types + variant `range`) | la Data ciblée | la Data ciblée |
| `kpi-card` | Valeur calculée mise en avant (format `raw`/`money`/`percent`/`integer`) | la Data ciblée | — |

## Blocs MVP encore à implémenter (Phase 6+)

- `chapter` / `blockinfo` (envelopes conditionnelles)
- `accordion` à items conditionnels (corpus `changer-de-classe`)
- `breakdown-table` (corpus `voiture` / `poids-lourd`)
- `notification` (sortie des `notifyError`/`notifyWarning` du moteur)
- `footnote` (corpus G6K)
- `reset-button` (corpus `taxeLogementsVacants`)

## Usage

```ts
import { createStandardRegistry, BlockRegistry } from "@g6k4ever/blocks";

const registry = createStandardRegistry();

// Récupérer une définition
const def = registry.get("text-section");

// Valider une config avant persistance
registry.validate("field", {
  dataId: 1, dataName: "commune", dataType: "text", label: "Commune", required: true,
});  // throws BlockValidationError si invalide

// Énumérer pour la palette de l'éditeur
const palette = registry.list().map((d) => d.editorMeta);
```

## Ajouter un bloc

1. Créer `src/blocks/<nom>.tsx` exportant un `BlockDefinition<TConfig>`.
2. Définir le schéma Zod de sa config.
3. Implémenter `readsDataIds` / `writesDataIds` pour l'analyse de dépendances.
4. Implémenter le composant `render` (DSFR, accessible, multi-instance safe).
5. L'enregistrer dans `createStandardRegistry()` (si standard) ou via `registry.register(def)` côté consommateur (si métier).

## Règle non négociable

**Un bloc = un fichier = une définition.** Ne pas dédoubler entre runtime et éditeur (cf. [`CLAUDE.md`](../../CLAUDE.md) §4 règle 2). L'éditeur configure, le runtime rend, **avec le même composant**.
